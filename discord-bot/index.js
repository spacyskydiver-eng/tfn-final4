import 'dotenv/config'
import { Client, GatewayIntentBits, EmbedBuilder, Events, ChannelType, PermissionFlagsBits } from 'discord.js'

const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
] })
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

      // Build items list from the order
      const items = Array.isArray(order.items) ? order.items : []
      const itemLines = items.map(item => {
        const socTag = item.isSoC !== undefined ? ` (${item.isSoC ? 'SoC' : 'Non-SoC'})` : ''
        return `• ${item.label}${socTag} — $${item.price}`
      }).join('\n') || '• (no items)'
      const totalUsd = order.totalUsd ?? order.priceUsd ?? 0
      const toolSummary = items.length === 1 ? items[0].label : `${items.length} tools`

      // Create a private ticket channel
      const channelName = `ticket-${productKey.toLowerCase()}`
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: `Order: ${productKey} | ${toolSummary}`,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          ...(staffRoleId
            ? [{ id: staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }]
            : []),
        ],
      })

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 Order Ticket`)
        .setColor(0x7c3aed)
        .setDescription(
          `Thanks for your order, <@${interaction.user.id}>!\n\n` +
          `A staff member will be with you shortly to complete payment and set up your bot.\n\n` +
          `**Product Key:** \`${productKey}\`\n\n` +
          `**Items:**\n${itemLines}\n\n` +
          `**Total: $${totalUsd}**`
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

      if (staffChannelId) {
        const staffChannel = guild.channels.cache.get(staffChannelId)
        if (staffChannel?.isTextBased()) {
          await staffChannel.send({
            embeds: [new EmbedBuilder()
              .setTitle('🛒 New Order Activated')
              .setColor(0xf59e0b)
              .addFields(
                { name: 'User',   value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Tools',  value: toolSummary,                                            inline: true },
                { name: 'Total',  value: `$${totalUsd}`,                                         inline: true },
                { name: 'Key',    value: `\`${productKey}\``,                                    inline: true },
                { name: 'Ticket', value: `<#${ticketChannel.id}>`,                               inline: true },
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

// ─── Governor verification ─────────────────────────────────────────────────────

// Cache server configs to avoid hitting API on every message (TTL 5 min)
const serverConfigCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

async function getVerifyConfig(guildId) {
  const cached = serverConfigCache.get(guildId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data
  try {
    const res = await fetch(`${API}/api/verify/servers/${guildId}`, {
      headers: { 'x-bot-secret': SECRET },
    })
    if (!res.ok) { serverConfigCache.set(guildId, { ts: Date.now(), data: null }); return null }
    const data = await res.json()
    serverConfigCache.set(guildId, { ts: Date.now(), data: data.server })
    return data.server
  } catch { return null }
}

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return
  if (!message.guild) return

  // Only process if there are image attachments
  const images = message.attachments.filter(a =>
    a.contentType?.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(a.name ?? '')
  )
  if (!images.size) return

  const guildId = message.guild.id
  const config = await getVerifyConfig(guildId)
  if (!config) return
  if (!config.active) return
  if (!config.channelId) return
  if (message.channelId !== config.channelId) return

  // Process first image
  const image = images.first()

  try {
    const res = await fetch(`${API}/api/verify/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-secret': SECRET },
      body: JSON.stringify({
        guildId,
        discordUserId: message.author.id,
        discordUsername: message.author.username,
        imageUrl: image.url,
      }),
    })
    const data = await res.json()

    const { result, govName, allianceTag, roleId, reason, staffRoleId } = data

    if (result === 'success') {
      // Assign role
      const member = await message.guild.members.fetch(message.author.id).catch(() => null)
      if (member && roleId) {
        await member.roles.add(roleId).catch(err => console.error('[verify] role assign failed:', err))
      }
      await message.reply({
        embeds: [{
          title: '✅ Verified!',
          description: `Welcome, **${govName ?? message.author.username}**! You've been successfully verified.`,
          color: 0x22c55e,
          fields: allianceTag ? [{ name: 'Alliance', value: allianceTag, inline: true }] : [],
          footer: { text: 'TFN Verification System' },
        }],
      }).catch(() => {})

    } else if (result === 'failed_alliance') {
      const staffMention = staffRoleId ? `<@&${staffRoleId}>` : ''
      await message.reply({
        content: staffMention || undefined,
        embeds: [{
          title: '❌ Verification Failed',
          description: `Your alliance tag **${allianceTag ?? 'none'}** is not recognized. ${staffMention ? 'A staff member has been notified.' : 'Please contact staff.'}`,
          color: 0xef4444,
          footer: { text: reason ?? '' },
        }],
      }).catch(() => {})

    } else if (result === 'already_used') {
      await message.reply({
        embeds: [{
          title: '⚠️ Already Verified',
          description: `Governor ID **${data.govId}** has already been used for verification in this server.`,
          color: 0xf59e0b,
        }],
      }).catch(() => {})

    } else if (result === 'parse_failed') {
      await message.reply({
        embeds: [{
          title: '⚠️ Could Not Read Profile',
          description: reason ?? 'Please post a clear screenshot of your governor profile screen.',
          color: 0xf59e0b,
          footer: { text: 'Tip: Open your profile and screenshot the full pop-up showing your governor ID' },
        }],
      }).catch(() => {})

    } else if (result === 'over_limit') {
      await message.reply({
        embeds: [{
          title: '⚠️ Verification Limit Reached',
          description: reason ?? 'This server has reached its monthly verification limit.',
          color: 0xf59e0b,
        }],
      }).catch(() => {})
    }
    // Invalidate cache so next check picks up fresh config
    serverConfigCache.delete(guildId)
  } catch (err) {
    console.error('[verify]', err)
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)
