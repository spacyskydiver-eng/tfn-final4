import 'dotenv/config'
import { Client, GatewayIntentBits, EmbedBuilder, Events, ChannelType, PermissionFlagsBits } from 'discord.js'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
const API = process.env.APP_URL
const SECRET = process.env.BOT_API_SECRET

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiGet(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'x-bot-secret': SECRET },
  })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json()
}

async function apiPatch(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-bot-secret': SECRET },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API PATCH ${path} → ${res.status}`)
  return res.json()
}

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bot-secret': SECRET },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API POST ${path} → ${res.status}`)
  return res.json()
}

const STATUS_COLOR = {
  pending:   0xf59e0b,
  active:    0x22c55e,
  paused:    0x6b7280,
  completed: 0x7c3aed,
}

// ─── Bot ready ────────────────────────────────────────────────────────────────

client.once(Events.ClientReady, () => {
  console.log(`✅ TFN Bot online as ${client.user.tag}`)
})

// ─── Slash commands ───────────────────────────────────────────────────────────

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return

  const { commandName } = interaction
  await interaction.deferReply({ ephemeral: true })

  try {
    // /kvklist
    if (commandName === 'kvklist') {
      const { kvks } = await apiGet('/api/kvk')
      if (!kvks.length) {
        return interaction.editReply('No KvK setups found.')
      }
      const embed = new EmbedBuilder()
        .setTitle('📋 KvK Setups')
        .setColor(0x7c3aed)
        .setDescription(
          kvks.map(k =>
            `**${k.name}** \`${k.id.slice(0, 8)}\`\n` +
            `Status: **${k.status}** | Bundle: ${k.bundle} | Kingdoms: ${k.kingdoms?.length ?? 0}`
          ).join('\n\n')
        )
        .setTimestamp()
      return interaction.editReply({ embeds: [embed] })
    }

    // /kvkstatus
    if (commandName === 'kvkstatus') {
      const kvkId = interaction.options.getString('kvk_id')
      const status = interaction.options.getString('status')
      await apiPatch(`/api/kvk/${kvkId}`, { status })
      const embed = new EmbedBuilder()
        .setTitle('✅ KvK Status Updated')
        .setColor(STATUS_COLOR[status] ?? 0x7c3aed)
        .addFields(
          { name: 'KvK ID', value: `\`${kvkId}\``, inline: true },
          { name: 'New Status', value: status.toUpperCase(), inline: true },
        )
        .setFooter({ text: `Updated by ${interaction.user.tag}` })
        .setTimestamp()
      return interaction.editReply({ embeds: [embed] })
    }

    // /kvkscan
    if (commandName === 'kvkscan') {
      const kvkId = interaction.options.getString('kvk_id')
      const type  = interaction.options.getString('type')
      // Post a scan trigger to the website which the bot server polls
      await apiPost(`/api/kvk/${kvkId}/schedule`, {
        label: `Manual scan by ${interaction.user.tag}`,
        cronExpr: '@manual',
        scanType: type,
        topN: 300,
        enabled: true,
      })
      const embed = new EmbedBuilder()
        .setTitle('🔍 Scan Triggered')
        .setColor(0x3b82f6)
        .addFields(
          { name: 'KvK ID',    value: `\`${kvkId}\``, inline: true },
          { name: 'Scan Type', value: type,            inline: true },
        )
        .setDescription('The scan has been queued. Results will appear on the dashboard once complete.')
        .setFooter({ text: `Triggered by ${interaction.user.tag}` })
        .setTimestamp()
      return interaction.editReply({ embeds: [embed] })
    }

    // /activate — user redeems a product key → creates a private ticket channel
    if (commandName === 'activate') {
      const productKey = interaction.options.getString('key').trim().toUpperCase()

      // Look up the order via the website API
      let order
      try {
        const data = await apiGet(`/api/orders/by-key/${productKey}`)
        order = data.order
      } catch {
        return interaction.editReply(
          `❌ Product key \`${productKey}\` not found. Please check the key and try again.`
        )
      }

      if (order.status === 'active') {
        return interaction.editReply('✅ This product key is already active — your bot is set up!')
      }
      if (order.status === 'cancelled') {
        return interaction.editReply('❌ This order has been cancelled. Contact staff for help.')
      }

      const guild = interaction.guild
      if (!guild) return interaction.editReply('❌ This command must be used in the TFN server.')

      const staffRoleId = process.env.DISCORD_STAFF_ROLE_ID
      const staffChannelId = process.env.DISCORD_STAFF_CHANNEL_ID

      // Create a private ticket channel
      const channelName = `ticket-${productKey.toLowerCase()}`
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: `Order: ${productKey} | Tool: ${order.toolType}`,
        permissionOverwrites: [
          // Deny everyone
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          // Allow the user who activated
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          // Allow staff role if configured
          ...(staffRoleId
            ? [{ id: staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }]
            : []),
        ],
      })

      // Post welcome message in the ticket
      const toolLabel = {
        'kvk-scanner':   'KvK Scanner',
        'title-giving':  'Title Giving',
        'fort-tracking': 'Fort Tracking',
        'player-finder': 'Player Finder',
        'alliance-mob':  'Alliance Mobilization',
        'discord-verify':'Discord Verification',
      }[order.toolType] ?? order.toolType

      const bundleInfo = order.bundle
        ? ` — ${order.bundle.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} (${order.isSoC ? 'SoC' : 'Non-SoC'})`
        : ''

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 Order Ticket — ${toolLabel}${bundleInfo}`)
        .setColor(0x7c3aed)
        .setDescription(
          `Thanks for your order, <@${interaction.user.id}>!\n\n` +
          `A staff member will be with you shortly to complete payment and set up your bot.\n\n` +
          `**Product Key:** \`${productKey}\`\n` +
          `**Tool:** ${toolLabel}${bundleInfo}\n` +
          `**Price:** $${order.priceUsd}`
        )
        .addFields(
          { name: 'Payment', value: 'Staff will send a PayPal invoice or payment link shortly.', inline: false },
          { name: 'Setup', value: 'Once payment is confirmed, your bot will be configured within 24 hours.', inline: false },
        )
        .setFooter({ text: 'TFN Bot Services' })
        .setTimestamp()

      await ticketChannel.send({
        content: staffRoleId ? `<@${interaction.user.id}> <@&${staffRoleId}>` : `<@${interaction.user.id}>`,
        embeds: [ticketEmbed],
      })

      // Notify staff channel if configured
      if (staffChannelId) {
        const staffChannel = guild.channels.cache.get(staffChannelId)
        if (staffChannel?.isTextBased()) {
          await staffChannel.send({
            embeds: [new EmbedBuilder()
              .setTitle('🛒 New Order Activated')
              .setColor(0xf59e0b)
              .addFields(
                { name: 'User',        value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Tool',        value: toolLabel,                                              inline: true },
                { name: 'Key',         value: `\`${productKey}\``,                                   inline: true },
                { name: 'Ticket',      value: `<#${ticketChannel.id}>`,                               inline: true },
              )
              .setTimestamp()
            ],
          }).catch(() => {})
        }
      }

      return interaction.editReply(
        `✅ Ticket created! Head to <#${ticketChannel.id}> — a staff member will help you complete your order.`
      )
    }

    // /kvkgoal
    if (commandName === 'kvkgoal') {
      const kvkId  = interaction.options.getString('kvk_id')
      const govId  = interaction.options.getString('gov_id')
      const dkpGoal = interaction.options.getNumber('dkp_goal')
      await apiPost(`/api/kvk/${kvkId}/goals`, {
        goals: [{ govId, playerName: govId, dkpGoal }],
      })
      const embed = new EmbedBuilder()
        .setTitle('🎯 DKP Goal Set')
        .setColor(0x22c55e)
        .addFields(
          { name: 'Gov ID',   value: govId,          inline: true },
          { name: 'DKP Goal', value: `${dkpGoal.toLocaleString()}`, inline: true },
        )
        .setFooter({ text: `Set by ${interaction.user.tag}` })
        .setTimestamp()
      return interaction.editReply({ embeds: [embed] })
    }

  } catch (err) {
    console.error(`[${commandName}]`, err)
    return interaction.editReply(`❌ Error: ${err.message}`)
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)
