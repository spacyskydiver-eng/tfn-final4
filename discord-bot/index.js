import 'dotenv/config'
import {
  Client, GatewayIntentBits, EmbedBuilder, Events, ChannelType,
  PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder,
  ButtonBuilder, ButtonStyle,
} from 'discord.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
})

const API    = process.env.APP_URL
const SECRET = process.env.BOT_API_SECRET

// ─── IDs ──────────────────────────────────────────────────────────────────────
const STAFF_ROLE_ID          = '1164685988468109354'
const LEADERSHIP_ROLE_ID     = '1465017809313464350'
const APPLICATION_CHANNEL_ID = '1164686107234013296'
const REVIEW_CHANNEL_ID      = process.env.DISCORD_LEADERSHIP_REVIEW_CHANNEL_ID

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiGet(path) {
  const res = await fetch(`${API}${path}`, { headers: { 'x-bot-secret': SECRET } })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
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

async function apiPatch(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-bot-secret': SECRET },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API PATCH ${path} → ${res.status}`)
  return res.json()
}

const STATUS_COLOR = {
  pending: 0xf59e0b, active: 0x22c55e, paused: 0x6b7280, completed: 0x7c3aed,
}

// ─── Ticket State ─────────────────────────────────────────────────────────────
// channelId → session object
const ticketSessions    = new Map()
// channelId → field name we're waiting for ('projectName','targetKingdom', etc.)
const awaitingText      = new Map()
// channelId → waiting for screenshot images
const awaitingScreenshots = new Set()
// channelId → waiting for "BOT INSTALLED" text, value = attempts so far
const awaitingBotInstall  = new Map()

// ─── Persistent leadership message ───────────────────────────────────────────

async function ensureLeadershipMessage(guild) {
  try {
    const channel = await guild.channels.fetch(APPLICATION_CHANNEL_ID).catch(() => null)
    if (!channel?.isTextBased()) return

    const embed = new EmbedBuilder()
      .setTitle('🏆 Project Leadership Applications')
      .setDescription(
        'Apply for a role in the **TFN Restart Project** network.\n\n' +
        'Use the menu below to choose your application type and open a private ticket.'
      )
      .setColor(0x7c3aed)
      .addFields(
        {
          name: '👑 Project Founder',
          value: 'Register a new restart project with TFN. Your project will be listed on the TFN website and accessible to leadership tools.',
          inline: false,
        },
        {
          name: '🏆 Project Leadership',
          value: 'Apply for leadership of an existing restart project — grants you the Leadership role in this server and TFN website access.',
          inline: false,
        },
      )
      .setFooter({ text: 'TFN Leadership System · Applications reviewed by staff' })

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('leadership_apply')
        .setPlaceholder('📋 Select application type...')
        .addOptions(
          { label: 'Project Founder Application', value: 'founder', description: 'Register a new restart project', emoji: '👑' },
          { label: 'Project Leadership Application', value: 'leadership', description: 'Apply for leadership of an existing project', emoji: '🏆' },
        )
    )

    const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null)
    const existing = messages?.find(m => m.author.id === client.user.id && m.components.length > 0)

    if (existing) {
      await existing.edit({ embeds: [embed], components: [row] }).catch(() => {})
    } else {
      await channel.send({ embeds: [embed], components: [row] })
    }
  } catch (err) {
    console.error('[leadership] Failed to post application message:', err)
  }
}

// ─── Shared ticket creation ───────────────────────────────────────────────────

async function createTicketChannel(guild, userId, userTag, type) {
  const shortId = Date.now().toString(36).toUpperCase()
  const name    = `${type}-${shortId}`
  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    topic: `${type === 'founder' ? 'Founder' : 'Leadership'} application — ${userTag}`,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny:  [PermissionFlagsBits.ViewChannel] },
      { id: userId,                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: STAFF_ROLE_ID,           allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
    ],
  })
  return channel
}

// ─── FOUNDER FLOW ─────────────────────────────────────────────────────────────

async function founderAskQ1(channel) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 1 of 7 — Project Name')
      .setDescription('**What is your project name?**\n\nType your answer in this channel.')
      .setColor(0x7c3aed)],
  })
  awaitingText.set(channel.id, 'projectName')
}

async function founderAskQ2(channel) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 2 of 7 — Target Kingdom')
      .setDescription('**Does your project have a target kingdom set?**\n\nA target kingdom is the kingdom your project plans to settle in.')
      .setColor(0x7c3aed)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('founder_q2:yes').setLabel('Yes').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('founder_q2:no').setLabel('No').setStyle(ButtonStyle.Secondary).setEmoji('❌'),
    )],
  })
}

async function founderAskQ2Kingdom(channel) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 2 of 7 — Target Kingdom Number')
      .setDescription('**What is your target kingdom number?**\n\nType the kingdom number in this channel (numbers only, e.g. `3542`).')
      .setColor(0x7c3aed)],
  })
  awaitingText.set(channel.id, 'targetKingdom')
}

async function founderAskQ3(channel) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 3 of 7 — Sleeper Process')
      .setDescription(
        '**Will your project use the sleeper process?**\n\n' +
        '• **Native Start** — accounts stay in the kingdom they are created in\n' +
        '• **Sleeper** — accounts grind for 15–20 days then migrate to a newer kingdom'
      )
      .setColor(0x7c3aed)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('founder_q3:yes').setLabel('Yes — Sleeper').setStyle(ButtonStyle.Primary).setEmoji('💤'),
      new ButtonBuilder().setCustomId('founder_q3:no').setLabel('No — Native Start').setStyle(ButtonStyle.Secondary).setEmoji('🏠'),
    )],
  })
}

async function founderAskQ3StartKingdom(channel) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 3 of 7 — Sleeper Starting Kingdom')
      .setDescription('**Does your project have a starting kingdom for sleeper accounts?**')
      .setColor(0x7c3aed)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('founder_q3s:yes').setLabel('Yes').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('founder_q3s:no').setLabel('No').setStyle(ButtonStyle.Secondary).setEmoji('❌'),
    )],
  })
}

async function founderAskQ3StartKingdomNumber(channel) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 3 of 7 — Starting Kingdom Number')
      .setDescription('**What is the starting kingdom number for sleeper accounts?**\n\nType the kingdom number in this channel.')
      .setColor(0x7c3aed)],
  })
  awaitingText.set(channel.id, 'sleeperKingdom')
}

async function founderAskQ4(channel) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 4 of 7 — Discord Server ID')
      .setDescription(
        '**What is your project\'s Discord server ID?**\n\n' +
        '**How to find it:**\n' +
        '1. Open Discord Settings → Advanced → Enable **Developer Mode**\n' +
        '2. Right-click your server name in the sidebar\n' +
        '3. Click **Copy Server ID**\n\n' +
        'Paste the ID in this channel (it looks like: `1034524321680457801`)'
      )
      .setColor(0x7c3aed)],
  })
  awaitingText.set(channel.id, 'guildId')
}

async function founderCheckAndAskQ5(channel, session) {
  const guildId = session.founderGuildId
  // Check if bot is in that server
  let botInServer = false
  try {
    const g = await client.guilds.fetch(guildId).catch(() => null)
    botInServer = !!g
  } catch { /* not in server */ }

  if (botInServer) {
    // Confirmed — fetch guild name
    try {
      const g = await client.guilds.cache.get(guildId) ?? await client.guilds.fetch(guildId)
      session.founderGuildName = g?.name ?? guildId
    } catch { session.founderGuildName = guildId }

    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle('Question 5 of 7 — Bot Installation ✅')
        .setDescription('The TFN Bot is confirmed in your server. Moving on...')
        .setColor(0x22c55e)],
    })
    await founderAskQ6(channel)
  } else {
    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle('Question 5 of 7 — Bot Not Found')
        .setDescription(
          `The TFN Bot was **not found** in the server with ID \`${guildId}\`.\n\n` +
          `Please add the bot to your server using this link:\n` +
          `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&scope=bot%20applications.commands&permissions=8\n\n` +
          `Once the bot is added, type **BOT INSTALLED** in this channel.`
        )
        .setColor(0xf59e0b)],
    })
    awaitingBotInstall.set(channel.id, 0)
  }
}

async function founderAskQ5(channel, session) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 5 of 7 — Bot Installation')
      .setDescription('**Does your project\'s Discord server have the TFN Bot installed?**')
      .setColor(0x7c3aed)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('founder_q5:yes').setLabel('Yes — it\'s installed').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('founder_q5:no').setLabel('No — I need to add it').setStyle(ButtonStyle.Secondary).setEmoji('❌'),
    )],
  })
}

async function founderAskQ6(channel) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 6 of 7 — TFN Website Login')
      .setDescription(
        `**Have you signed into the TFN website with your current Discord account?**\n\n` +
        `Website: ${process.env.APP_URL}\n\n` +
        `This is required so the website can recognise you as the project founder and grant you access to the leadership tools.`
      )
      .setColor(0x7c3aed)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('founder_q6:yes').setLabel('Yes — I\'ve signed in').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('founder_q6:no').setLabel('Not yet').setStyle(ButtonStyle.Secondary).setEmoji('❌'),
    )],
  })
}

async function founderAskQ7(channel) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 7 of 7 — Server Invite Link')
      .setDescription(
        '**Please provide the invite link to your project\'s Discord server.**\n\n' +
        'You can create a permanent invite by: Right-clicking your server → **Invite People** → set it to never expire.\n\n' +
        'Paste the link in this channel (e.g. `https://discord.gg/xxxxxxx`)'
      )
      .setColor(0x7c3aed)],
  })
  awaitingText.set(channel.id, 'serverLink')
}

async function founderSendSummary(channel, session) {
  const sleepStr = session.founderUsesSleeper
    ? `Yes — Starting kingdom: ${session.founderSleeperKingdom ?? 'N/A'}`
    : 'No — Native Start'

  const deployBtn = new ButtonBuilder()
    .setCustomId(`founder_deploy:${session.applicationId}`)
    .setLabel('✅ Approve & Submit (Staff Only)')
    .setStyle(ButtonStyle.Success)

  await channel.send({
    content: `<@&${STAFF_ROLE_ID}>`,
    embeds: [new EmbedBuilder()
      .setTitle('📋 Project Founder Application — Summary')
      .setColor(0x7c3aed)
      .addFields(
        { name: 'Project Name',      value: session.founderProjectName ?? '—',                          inline: true  },
        { name: 'Target Kingdom',    value: session.founderTargetKingdom ?? 'N/A',                       inline: true  },
        { name: 'Sleeper Process',   value: sleepStr,                                                    inline: false },
        { name: 'Discord Server ID', value: `\`${session.founderGuildId ?? '—'}\``,                      inline: true  },
        { name: 'Guild Name',        value: session.founderGuildName ?? '—',                             inline: true  },
        { name: 'Server Link',       value: session.founderServerLink ?? '—',                            inline: false },
        { name: 'Website Login',     value: session.founderWebsiteLogin ? 'Yes ✅' : 'Not yet ⚠️',        inline: true  },
        { name: 'Applicant',         value: `<@${session.userId}> (${session.username})`,                inline: false },
      )
      .setFooter({ text: 'Staff: click the button below to approve and submit this project' })],
    components: [new ActionRowBuilder().addComponents(deployBtn)],
  })

  // Save full data to application record
  await apiPatch(`/api/leadership/applications/${session.applicationId}`, {
    status: 'reviewing',
  }).catch(() => {})
}

// ─── LEADERSHIP FLOW ──────────────────────────────────────────────────────────

async function leadershipSendQ1(channel, session) {
  let projects = []
  try {
    const data = await apiGet('/api/restart-projects')
    projects = data.projects ?? []
  } catch { /* no projects */ }

  if (projects.length === 0) {
    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle('⚠️ No Projects Available')
        .setDescription('There are currently no registered restart projects. Please contact staff.')
        .setColor(0xf59e0b)],
    })
    return
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('leadership_q1_select')
    .setPlaceholder('Select your project...')
    .addOptions(projects.slice(0, 25).map(p => ({
      label: p.name,
      value: p.id,
      description: p.guildName ?? undefined,
    })))

  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 1 of 3 — Select Project')
      .setDescription('**Which restart project are you applying for leadership of?**')
      .setColor(0x7c3aed)],
    components: [new ActionRowBuilder().addComponents(select)],
  })

  // Store full projects list for lookup later
  session.allProjects = projects
}

async function leadershipSendQ2(channel, session) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 2 of 3 — Discord Permission')
      .setDescription(`**Has the project founder given permission for you to hold the Leadership role in the TFN Discord server for the __${session.projectName}__ project?**`)
      .setColor(0x7c3aed)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('leadership_q2:yes').setLabel('Yes — I have permission').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('leadership_q2:no').setLabel('No').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    )],
  })
}

async function leadershipSendQ3(channel, session) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 3 of 3 — Website Permission')
      .setDescription(`**Has the project founder given permission for you to have TFN website leadership access for the __${session.projectName}__ project?**\n\nThis grants access to Ark of Osiris and future leadership tools on the TFN website.`)
      .setColor(0x7c3aed)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('leadership_q3:yes').setLabel('Yes — I have permission').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('leadership_q3:no').setLabel('No').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    )],
  })
}

async function leadershipSendSummary(channel, session) {
  // Save to DB
  await apiPatch(`/api/leadership/applications/${session.applicationId}`, {
    projectId:         session.projectId,
    leaderPermDiscord: session.leaderPermDiscord,
    leaderPermWebsite: session.leaderPermWebsite,
    status:            'reviewing',
  }).catch(() => {})

  const project = session.allProjects?.find(p => p.id === session.projectId)
  const serverLink = project?.serverLink ?? null
  const founderName = project?.founderUsername ?? null

  const deployBtn = new ButtonBuilder()
    .setCustomId(`leadership_deploy:${session.applicationId}`)
    .setLabel('✅ Deployment Phase (Staff Only)')
    .setStyle(ButtonStyle.Success)

  await channel.send({
    content: `<@&${STAFF_ROLE_ID}>`,
    embeds: [new EmbedBuilder()
      .setTitle('📋 Leadership Application — Summary')
      .setColor(0x7c3aed)
      .addFields(
        { name: 'Project',            value: session.projectName ?? '—',                          inline: true  },
        { name: 'Project Founder',    value: founderName ?? '—',                                  inline: true  },
        { name: 'Server Link',        value: serverLink ?? '—',                                   inline: false },
        { name: 'Discord Permission', value: session.leaderPermDiscord ? 'Yes ✅' : 'No ❌',       inline: true  },
        { name: 'Website Permission', value: session.leaderPermWebsite ? 'Yes ✅' : 'No ❌',       inline: true  },
        { name: 'Applicant',          value: `<@${session.userId}> (${session.username})`,        inline: false },
      )
      .setFooter({ text: 'Staff: click the button below once you have reviewed this application' })],
    components: [new ActionRowBuilder().addComponents(deployBtn)],
  })
}

// ─── Interaction handler ──────────────────────────────────────────────────────

client.on(Events.InteractionCreate, async interaction => {

  // ── Slash commands ──────────────────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction
    await interaction.deferReply({ ephemeral: true })
    try {
      if (commandName === 'kvklist') {
        const { kvks } = await apiGet('/api/kvk')
        if (!kvks.length) return interaction.editReply('No KvK setups found.')
        const embed = new EmbedBuilder()
          .setTitle('📋 KvK Setups')
          .setColor(0x7c3aed)
          .setDescription(kvks.map(k =>
            `**${k.name}** \`${k.id.slice(0, 8)}\`\n` +
            `Status: **${k.status}** | Bundle: ${k.bundle} | Kingdoms: ${k.kingdoms?.length ?? 0}`
          ).join('\n\n'))
          .setTimestamp()
        return interaction.editReply({ embeds: [embed] })
      }

      if (commandName === 'kvkstatus') {
        const kvkId  = interaction.options.getString('kvk_id')
        const status = interaction.options.getString('status')
        await apiPatch(`/api/kvk/${kvkId}`, { status })
        const embed = new EmbedBuilder()
          .setTitle('✅ KvK Status Updated')
          .setColor(STATUS_COLOR[status] ?? 0x7c3aed)
          .addFields(
            { name: 'KvK ID',     value: `\`${kvkId}\``, inline: true },
            { name: 'New Status', value: status.toUpperCase(), inline: true },
          )
          .setFooter({ text: `Updated by ${interaction.user.tag}` })
          .setTimestamp()
        return interaction.editReply({ embeds: [embed] })
      }

      if (commandName === 'kvkscan') {
        const kvkId = interaction.options.getString('kvk_id')
        const type  = interaction.options.getString('type')
        await apiPost(`/api/kvk/${kvkId}/schedule`, {
          label: `Manual scan by ${interaction.user.tag}`,
          cronExpr: '@manual', scanType: type, topN: 300, enabled: true,
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

      if (commandName === 'kvkgoal') {
        const kvkId   = interaction.options.getString('kvk_id')
        const govId   = interaction.options.getString('gov_id')
        const dkpGoal = interaction.options.getNumber('dkp_goal')
        await apiPost(`/api/kvk/${kvkId}/goals`, { goals: [{ govId, playerName: govId, dkpGoal }] })
        const embed = new EmbedBuilder()
          .setTitle('🎯 DKP Goal Set')
          .setColor(0x22c55e)
          .addFields(
            { name: 'Gov ID',   value: govId,                          inline: true },
            { name: 'DKP Goal', value: `${dkpGoal.toLocaleString()}`,  inline: true },
          )
          .setFooter({ text: `Set by ${interaction.user.tag}` })
          .setTimestamp()
        return interaction.editReply({ embeds: [embed] })
      }

      if (commandName === 'activate') {
        const productKey = interaction.options.getString('key').trim().toUpperCase()
        let order
        try {
          const data = await apiGet(`/api/orders/by-key/${productKey}`)
          order = data.order
        } catch {
          return interaction.editReply(`❌ Product key \`${productKey}\` not found. Please check the key and try again.`)
        }
        if (order.status === 'active')     return interaction.editReply('✅ This product key is already active — your bot is set up!')
        if (order.status === 'cancelled')  return interaction.editReply('❌ This order has been cancelled. Contact staff for help.')

        const guild = interaction.guild
        if (!guild) return interaction.editReply('❌ This command must be used in the TFN server.')

        const staffRoleId    = process.env.DISCORD_STAFF_ROLE_ID
        const staffChannelId = process.env.DISCORD_STAFF_CHANNEL_ID

        const items        = Array.isArray(order.items) ? order.items : []
        const itemLines    = items.map(item => {
          const socTag = item.isSoC !== undefined ? ` (${item.isSoC ? 'SoC' : 'Non-SoC'})` : ''
          return `• ${item.label}${socTag} — $${item.price}`
        }).join('\n') || '• (no items)'
        const totalUsd    = order.totalUsd ?? order.priceUsd ?? 0
        const toolSummary = items.length === 1 ? items[0].label : `${items.length} tools`

        const channelName   = `ticket-${productKey.toLowerCase()}`
        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          topic: `Order: ${productKey} | ${toolSummary}`,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            ...(staffRoleId ? [{ id: staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }] : []),
          ],
        })

        const ticketEmbed = new EmbedBuilder()
          .setTitle('🎫 Order Ticket')
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
            { name: 'Setup',   value: 'Once payment is confirmed, your bot will be configured within 24 hours.', inline: false },
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
            await staffChannel.send({ embeds: [new EmbedBuilder()
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
            ] }).catch(() => {})
          }
        }
        return interaction.editReply(`✅ Ticket created! Head to <#${ticketChannel.id}> — a staff member will help you complete your order.`)
      }

      // ── /continue (staff) ────────────────────────────────────────────────────
      if (commandName === 'continue') {
        const member = interaction.member
        if (!member?.roles?.cache?.has(STAFF_ROLE_ID)) {
          return interaction.editReply('❌ Only staff can use this command.')
        }
        const ticketName = interaction.options.getString('ticket').toLowerCase()
        const guild = interaction.guild
        const ch = guild?.channels.cache.find(c => c.name === ticketName)
        if (!ch) return interaction.editReply(`❌ Could not find channel \`${ticketName}\`.`)
        const session = ticketSessions.get(ch.id)
        if (!session) return interaction.editReply(`❌ No active session found for \`${ticketName}\`.`)
        if (!awaitingBotInstall.has(ch.id)) return interaction.editReply(`❌ That ticket is not waiting on bot installation.`)
        // Reset attempts and re-check
        awaitingBotInstall.delete(ch.id)
        await founderCheckAndAskQ5(ch, session)
        return interaction.editReply(`✅ Resumed \`${ticketName}\` — re-checking bot installation.`)
      }

    } catch (err) {
      console.error(`[${commandName}]`, err)
      return interaction.editReply(`❌ Error: ${err.message}`)
    }
    return
  }

  // ── Select menu: Apply type ─────────────────────────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === 'leadership_apply') {
    await interaction.deferUpdate()
    const guild = interaction.guild
    if (!guild) return interaction.followUp({ content: '❌ This must be used in the TFN server.', ephemeral: true })

    const applicationType = interaction.values[0] // 'founder' or 'leadership'

    // Check for existing open ticket from this user (clean stale ones first)
    for (const [channelId, s] of ticketSessions) {
      if (s.userId === interaction.user.id) {
        const ch = guild.channels.cache.get(channelId)
        if (!ch) { ticketSessions.delete(channelId); awaitingText.delete(channelId); awaitingBotInstall.delete(channelId); continue }
        return interaction.followUp({ content: `❌ You already have an open application ticket. Please complete it first: <#${channelId}>`, ephemeral: true })
      }
    }

    try {
      const ticketChannel = await createTicketChannel(guild, interaction.user.id, interaction.user.tag, applicationType)

      const { application } = await apiPost('/api/leadership/applications', {
        type:            applicationType,
        discordUserId:   interaction.user.id,
        discordUsername: interaction.user.tag,
        ticketChannelId: ticketChannel.id,
      })

      const session = {
        type:            applicationType,
        applicationId:   application.id,
        userId:          interaction.user.id,
        username:        interaction.user.tag,
      }
      ticketSessions.set(ticketChannel.id, session)

      const isFounder = applicationType === 'founder'

      await ticketChannel.send({
        content: `Welcome <@${interaction.user.id}>! <@&${STAFF_ROLE_ID}>`,
        embeds: [new EmbedBuilder()
          .setTitle(isFounder ? '👑 Project Founder Application' : '🏆 Project Leadership Application')
          .setDescription(
            `Hi **${interaction.user.username}**! This is your private application ticket.\n\n` +
            `Please answer the following questions honestly. Staff will review your answers.\n\n` +
            `_Your progress is saved automatically._`
          )
          .setColor(0x7c3aed)],
      })

      if (isFounder) {
        await founderAskQ1(ticketChannel)
      } else {
        await leadershipSendQ1(ticketChannel, session)
      }

      return interaction.followUp({ content: `✅ Your ticket has been created: <#${ticketChannel.id}>`, ephemeral: true })
    } catch (err) {
      console.error('[apply]', err)
      return interaction.followUp({ content: `❌ Failed to create ticket: ${err.message}`, ephemeral: true })
    }
  }

  // ── Helper: get session and validate user ────────────────────────────────────
  const getSession = (check = true) => {
    const session = ticketSessions.get(interaction.channelId)
    if (check && (!session || interaction.user.id !== session.userId)) {
      interaction.reply({ content: '❌ This is not your application.', ephemeral: true }).catch(() => {})
      return null
    }
    return session
  }

  // ─── FOUNDER BUTTON HANDLERS ─────────────────────────────────────────────────

  if (interaction.isButton() && interaction.customId.startsWith('founder_q2:')) {
    const session = getSession(); if (!session) return
    await interaction.deferUpdate()
    const yes = interaction.customId.endsWith(':yes')
    await interaction.message.edit({
      embeds: [new EmbedBuilder().setTitle('Question 2 of 7 — Target Kingdom').setDescription('**Does your project have a target kingdom set?**').setColor(0x7c3aed).setFooter({ text: `Your answer: ${yes ? 'Yes ✅' : 'No ❌'}` })],
      components: [],
    }).catch(() => {})
    if (yes) {
      await founderAskQ2Kingdom(interaction.channel)
    } else {
      session.founderTargetKingdom = 'N/A'
      await founderAskQ3(interaction.channel)
    }
    return
  }

  if (interaction.isButton() && interaction.customId.startsWith('founder_q3:')) {
    const session = getSession(); if (!session) return
    await interaction.deferUpdate()
    const usesSleeper = interaction.customId.endsWith(':yes')
    session.founderUsesSleeper = usesSleeper
    await interaction.message.edit({
      embeds: [new EmbedBuilder().setTitle('Question 3 of 7 — Sleeper Process').setDescription('**Will your project use the sleeper process?**').setColor(0x7c3aed).setFooter({ text: `Your answer: ${usesSleeper ? 'Yes — Sleeper 💤' : 'No — Native Start 🏠'}` })],
      components: [],
    }).catch(() => {})
    if (usesSleeper) {
      await founderAskQ3StartKingdom(interaction.channel)
    } else {
      session.founderSleeperKingdom = null
      await founderAskQ4(interaction.channel)
    }
    return
  }

  if (interaction.isButton() && interaction.customId.startsWith('founder_q3s:')) {
    const session = getSession(); if (!session) return
    await interaction.deferUpdate()
    const hasKingdom = interaction.customId.endsWith(':yes')
    await interaction.message.edit({
      embeds: [new EmbedBuilder().setTitle('Question 3 of 7 — Starting Kingdom').setDescription('**Does your project have a starting kingdom for sleeper accounts?**').setColor(0x7c3aed).setFooter({ text: `Your answer: ${hasKingdom ? 'Yes ✅' : 'No ❌'}` })],
      components: [],
    }).catch(() => {})
    if (hasKingdom) {
      await founderAskQ3StartKingdomNumber(interaction.channel)
    } else {
      session.founderSleeperKingdom = 'N/A'
      await founderAskQ4(interaction.channel)
    }
    return
  }

  if (interaction.isButton() && interaction.customId.startsWith('founder_q5:')) {
    const session = getSession(); if (!session) return
    await interaction.deferUpdate()
    const says_yes = interaction.customId.endsWith(':yes')
    await interaction.message.edit({
      embeds: [new EmbedBuilder().setTitle('Question 5 of 7 — Bot Installation').setDescription('**Does your project\'s Discord server have the TFN Bot installed?**').setColor(0x7c3aed).setFooter({ text: `Your answer: ${says_yes ? 'Yes ✅' : 'No ❌'}` })],
      components: [],
    }).catch(() => {})
    // Either way, check if bot is actually in the server
    await founderCheckAndAskQ5(interaction.channel, session)
    return
  }

  if (interaction.isButton() && interaction.customId.startsWith('founder_q6:')) {
    const session = getSession(); if (!session) return
    await interaction.deferUpdate()
    const yes = interaction.customId.endsWith(':yes')
    session.founderWebsiteLogin = yes
    await interaction.message.edit({
      embeds: [new EmbedBuilder().setTitle('Question 6 of 7 — Website Login').setDescription('**Have you signed into the TFN website with your current Discord account?**').setColor(0x7c3aed).setFooter({ text: `Your answer: ${yes ? 'Yes ✅' : 'Not yet ⚠️'}` })],
      components: [],
    }).catch(() => {})
    if (!yes) {
      await interaction.channel.send({
        embeds: [new EmbedBuilder()
          .setTitle('⚠️ Please Sign In')
          .setDescription(`Please sign into the TFN website at **${process.env.APP_URL}** using the "Login with Discord" button, then come back and continue.\n\nOnce you've signed in, click the button below.`)
          .setColor(0xf59e0b)],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('founder_q6_retry').setLabel('I have now signed in').setStyle(ButtonStyle.Primary).setEmoji('✅'),
        )],
      })
    } else {
      await founderAskQ7(interaction.channel)
    }
    return
  }

  if (interaction.isButton() && interaction.customId === 'founder_q6_retry') {
    const session = getSession(); if (!session) return
    await interaction.deferUpdate()
    session.founderWebsiteLogin = true
    await interaction.message.edit({
      embeds: [new EmbedBuilder().setTitle('Question 6 of 7 — Website Login').setDescription('✅ Confirmed — continuing to the next question.').setColor(0x22c55e)],
      components: [],
    }).catch(() => {})
    await founderAskQ7(interaction.channel)
    return
  }

  // ── Founder Deployment Phase (staff only) ────────────────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith('founder_deploy:')) {
    const applicationId = interaction.customId.split(':')[1]
    const member = interaction.member
    if (!member?.roles?.cache?.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Only staff can use this button.', ephemeral: true })
    }
    await interaction.deferUpdate()

    let appData = null
    try {
      const { application } = await apiGet(`/api/leadership/applications/${applicationId}`)
      appData = application
    } catch (err) {
      return interaction.followUp({ content: `❌ Could not load application: ${err.message}`, ephemeral: true })
    }

    const guild  = interaction.guild
    const review = REVIEW_CHANNEL_ID ? await guild.channels.fetch(REVIEW_CHANNEL_ID).catch(() => null) : null

    const session = [...ticketSessions.values()].find(s => s.applicationId === applicationId)

    if (review?.isTextBased()) {
      const sleepStr = session?.founderUsesSleeper
        ? `Yes — Starting kingdom: ${session.founderSleeperKingdom ?? 'N/A'}`
        : 'No — Native Start'

      const approveBtn = new ButtonBuilder()
        .setCustomId(`founder_approve:${applicationId}`)
        .setLabel('✅ Approve Project')
        .setStyle(ButtonStyle.Success)

      const denyBtn = new ButtonBuilder()
        .setCustomId(`founder_deny:${applicationId}`)
        .setLabel('❌ Deny Application')
        .setStyle(ButtonStyle.Danger)

      await review.send({
        content: `<@&${STAFF_ROLE_ID}> — New project founder application. Please review and approve/deny below.`,
        embeds: [new EmbedBuilder()
          .setTitle(`👑 Founder Application — ${appData.discordUsername}`)
          .setColor(0x7c3aed)
          .addFields(
            { name: 'Project Name',      value: session?.founderProjectName ?? '—',                 inline: true  },
            { name: 'Target Kingdom',    value: session?.founderTargetKingdom ?? 'N/A',              inline: true  },
            { name: 'Sleeper Process',   value: sleepStr,                                            inline: false },
            { name: 'Discord Server ID', value: `\`${session?.founderGuildId ?? '—'}\``,             inline: true  },
            { name: 'Guild Name',        value: session?.founderGuildName ?? '—',                   inline: true  },
            { name: 'Server Link',       value: session?.founderServerLink ?? '—',                  inline: false },
            { name: 'Website Login',     value: session?.founderWebsiteLogin ? 'Yes ✅' : 'No ⚠️',  inline: true  },
            { name: 'Applicant',         value: `<@${appData.discordUserId}> (${appData.discordUsername})`, inline: false },
          )
          .setFooter({ text: `App ID: ${applicationId.slice(0, 12)}` })
          .setTimestamp()],
        components: [new ActionRowBuilder().addComponents(approveBtn, denyBtn)],
      }).catch(err => console.error('[founder_deploy] review send failed:', err))
    }

    // Close ticket in 60s
    const ticketChannel = interaction.channel
    await ticketChannel.send({
      embeds: [new EmbedBuilder()
        .setTitle('⏳ Ticket Closing')
        .setDescription('Your application has been submitted to staff for review. This ticket will close in **60 seconds**.\n\nYou will be notified once a decision is made.')
        .setColor(0xf59e0b)],
    })

    setTimeout(async () => {
      const channelId = ticketChannel.id
      ticketSessions.delete(channelId)
      awaitingText.delete(channelId)
      awaitingBotInstall.delete(channelId)
      await ticketChannel.delete('Founder application submitted').catch(() => {
        ticketChannel.permissionOverwrites.set([
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] },
        ]).catch(() => {})
      })
    }, 60_000)

    return
  }

  // ── Founder Approve (staff, in review channel) ───────────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith('founder_approve:')) {
    const applicationId = interaction.customId.split(':')[1]
    const member = interaction.member
    if (!member?.roles?.cache?.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Only staff can use this button.', ephemeral: true })
    }
    await interaction.deferUpdate()

    let appData = null
    try {
      const { application } = await apiGet(`/api/leadership/applications/${applicationId}`)
      appData = application
    } catch (err) {
      return interaction.followUp({ content: `❌ Could not load application: ${err.message}`, ephemeral: true })
    }

    // Find the session data (may be gone if bot restarted — use appData fields)
    const embed = interaction.message.embeds[0]
    const fields = {}
    embed?.fields?.forEach(f => { fields[f.name] = f.value })

    const projectName    = fields['Project Name']    ?? appData.discordUsername + '\'s Project'
    const guildIdRaw     = fields['Discord Server ID']?.replace(/`/g, '') ?? ''
    const guildName      = fields['Guild Name']      ?? ''
    const serverLink     = fields['Server Link']     ?? null
    const targetKingdom  = fields['Target Kingdom']  ?? null
    const sleepLine      = fields['Sleeper Process'] ?? ''
    const usesSleeper    = sleepLine.startsWith('Yes')
    const sleeperKingdom = usesSleeper ? (sleepLine.includes('N/A') ? 'N/A' : sleepLine.split(': ')[1]) : null

    try {
      await apiPost('/api/restart-projects', {
        name:             projectName,
        guildId:          guildIdRaw,
        guildName:        guildName,
        serverLink:       serverLink !== '—' ? serverLink : null,
        founderDiscordId: appData.discordUserId,
        founderUsername:  appData.discordUsername,
        targetKingdom:    targetKingdom !== 'N/A' ? targetKingdom : null,
        usesSleeper,
        sleeperKingdom:   sleeperKingdom !== 'N/A' ? sleeperKingdom : null,
      })

      await apiPatch(`/api/leadership/applications/${applicationId}`, { status: 'approved' })

      // Disable buttons
      await interaction.message.edit({
        components: [new ActionRowBuilder().addComponents(
          ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true),
          ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true),
        )],
      }).catch(() => {})

      await interaction.followUp({
        content: `✅ **Project approved** by <@${interaction.user.id}>. Project **${projectName}** has been added to the website.`,
      }).catch(() => {})

      // Try to notify applicant
      const applicant = await interaction.guild.members.fetch(appData.discordUserId).catch(() => null)
      if (applicant) {
        await applicant.roles.add(LEADERSHIP_ROLE_ID).catch(() => {})
        await applicant.send(`✅ Your project **${projectName}** has been approved by TFN staff and added to the website! You have been given the Leadership role in the TFN server.`).catch(() => {})
      }
    } catch (err) {
      console.error('[founder_approve]', err)
      await interaction.followUp({ content: `❌ Failed to create project: ${err.message}`, ephemeral: true })
    }
    return
  }

  // ── Founder Deny (staff, in review channel) ──────────────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith('founder_deny:')) {
    const applicationId = interaction.customId.split(':')[1]
    const member = interaction.member
    if (!member?.roles?.cache?.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Only staff can use this button.', ephemeral: true })
    }
    await interaction.deferUpdate()
    await apiPatch(`/api/leadership/applications/${applicationId}`, { status: 'denied' }).catch(() => {})
    await interaction.message.edit({
      components: [new ActionRowBuilder().addComponents(
        ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true),
        ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true),
      )],
    }).catch(() => {})
    await interaction.followUp({ content: `❌ **Application denied** by <@${interaction.user.id}>.` }).catch(() => {})
    return
  }

  // ─── LEADERSHIP BUTTON HANDLERS ───────────────────────────────────────────────

  if (interaction.isStringSelectMenu() && interaction.customId === 'leadership_q1_select') {
    const session = getSession(); if (!session) return
    await interaction.deferUpdate()
    const projectId = interaction.values[0]
    const selectedOption = interaction.component.options?.find(o => o.value === projectId)
    session.projectId   = projectId
    session.projectName = selectedOption?.label ?? projectId
    await interaction.message.edit({
      embeds: [new EmbedBuilder()
        .setTitle('Question 1 of 3 — Select Project')
        .setDescription('**Which restart project are you applying for leadership of?**')
        .setColor(0x7c3aed)
        .setFooter({ text: `Your answer: ${session.projectName}` })],
      components: [],
    }).catch(() => {})
    await leadershipSendQ2(interaction.channel, session)
    return
  }

  if (interaction.isButton() && interaction.customId.startsWith('leadership_q2:')) {
    const session = getSession(); if (!session) return
    await interaction.deferUpdate()
    session.leaderPermDiscord = interaction.customId.endsWith(':yes')
    await interaction.message.edit({
      embeds: [new EmbedBuilder()
        .setTitle('Question 2 of 3 — Discord Permission')
        .setDescription(`**Has the project founder given permission for Discord leadership for the __${session.projectName}__ project?**`)
        .setColor(0x7c3aed)
        .setFooter({ text: `Your answer: ${session.leaderPermDiscord ? 'Yes ✅' : 'No ❌'}` })],
      components: [],
    }).catch(() => {})
    await leadershipSendQ3(interaction.channel, session)
    return
  }

  if (interaction.isButton() && interaction.customId.startsWith('leadership_q3:')) {
    const session = getSession(); if (!session) return
    await interaction.deferUpdate()
    session.leaderPermWebsite = interaction.customId.endsWith(':yes')
    await interaction.message.edit({
      embeds: [new EmbedBuilder()
        .setTitle('Question 3 of 3 — Website Permission')
        .setDescription(`**Has the project founder given permission for TFN website leadership access for the __${session.projectName}__ project?**`)
        .setColor(0x7c3aed)
        .setFooter({ text: `Your answer: ${session.leaderPermWebsite ? 'Yes ✅' : 'No ❌'}` })],
      components: [],
    }).catch(() => {})
    await leadershipSendSummary(interaction.channel, session)
    return
  }

  // ── Leadership Deployment Phase (staff only) ─────────────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith('leadership_deploy:')) {
    const applicationId = interaction.customId.split(':')[1]
    const member = interaction.member
    if (!member?.roles?.cache?.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Only staff can use this button.', ephemeral: true })
    }
    await interaction.deferUpdate()

    let appData = null
    try {
      const { application } = await apiGet(`/api/leadership/applications/${applicationId}`)
      appData = application
    } catch (err) {
      return interaction.followUp({ content: `❌ Could not load application: ${err.message}`, ephemeral: true })
    }

    const guild  = interaction.guild
    const review = REVIEW_CHANNEL_ID ? await guild.channels.fetch(REVIEW_CHANNEL_ID).catch(() => null) : null

    if (review?.isTextBased()) {
      const rows = []

      if (appData.leaderPermDiscord) {
        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`leadership_verify:q2:${applicationId}`)
            .setPlaceholder('Verify — Discord leadership permission')
            .addOptions(
              { label: 'Verified — grant Discord Leadership role', value: 'verified', emoji: '✅' },
              { label: 'Denied — cannot confirm permission', value: 'denied', emoji: '❌' },
            )
        ))
      }

      if (appData.leaderPermWebsite) {
        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`leadership_verify:q4:${applicationId}`)
            .setPlaceholder('Verify — website leadership permission')
            .addOptions(
              { label: 'Verified — grant website leadership role', value: 'verified', emoji: '✅' },
              { label: 'Denied — cannot confirm permission', value: 'denied', emoji: '❌' },
            )
        ))
      }

      const session = [...ticketSessions.values()].find(s => s.applicationId === applicationId)
      const project = session?.allProjects?.find(p => p.id === appData.projectId)
      const serverLink  = project?.serverLink  ?? appData.project?.serverLink  ?? null
      const founderName = project?.founderUsername ?? appData.project?.founderUsername ?? null

      await review.send({
        content: `<@&${STAFF_ROLE_ID}> — Leadership application for review.`,
        embeds: [new EmbedBuilder()
          .setTitle(`🏆 Leadership Application — ${appData.discordUsername}`)
          .setColor(0x7c3aed)
          .addFields(
            { name: 'Project',            value: appData.project?.name ?? '—',                          inline: true  },
            { name: 'Project Founder',    value: founderName ?? '—',                                    inline: true  },
            { name: 'Server Link',        value: serverLink ?? '—',                                     inline: false },
            { name: 'Discord Permission', value: appData.leaderPermDiscord ? 'Yes ✅' : 'No ❌',         inline: true  },
            { name: 'Website Permission', value: appData.leaderPermWebsite ? 'Yes ✅' : 'No ❌',         inline: true  },
            { name: 'Applicant',          value: `<@${appData.discordUserId}> (${appData.discordUsername})`, inline: false },
          )
          .setFooter({ text: `App ID: ${applicationId.slice(0, 12)}` })
          .setTimestamp()],
        components: rows,
      }).catch(err => console.error('[leadership_deploy] review send failed:', err))
    }

    // Close ticket in 60s
    const ticketChannel = interaction.channel
    await ticketChannel.send({
      embeds: [new EmbedBuilder()
        .setTitle('⏳ Ticket Closing')
        .setDescription('Your application has been received and is being reviewed by staff. This ticket will close in **60 seconds**.')
        .setColor(0xf59e0b)],
    })

    setTimeout(async () => {
      const channelId = ticketChannel.id
      ticketSessions.delete(channelId)
      awaitingText.delete(channelId)
      awaitingBotInstall.delete(channelId)
      await ticketChannel.delete('Leadership ticket closed').catch(() => {
        ticketChannel.permissionOverwrites.set([
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] },
        ]).catch(() => {})
      })
    }, 60_000)

    return
  }

  // ── Staff verification selects (leadership) ──────────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('leadership_verify:')) {
    const [, questionKey, applicationId] = interaction.customId.split(':')
    const decision = interaction.values[0]
    const member = interaction.member
    if (!member?.roles?.cache?.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Only staff can verify applications.', ephemeral: true })
    }
    await interaction.deferUpdate()

    let appData = null
    try {
      const { application } = await apiGet(`/api/leadership/applications/${applicationId}`)
      appData = application
    } catch (err) {
      return interaction.followUp({ content: '❌ Could not load application.', ephemeral: true })
    }

    const patchPayload = {}
    if (questionKey === 'q2') patchPayload.staffVerifiedQ2 = decision
    if (questionKey === 'q4') patchPayload.staffVerifiedQ4 = decision
    await apiPatch(`/api/leadership/applications/${applicationId}`, patchPayload).catch(() => {})

    const guild  = interaction.guild
    const qLabel = { q2: 'Discord Permission', q4: 'Website Permission' }[questionKey] ?? questionKey

    if (decision === 'verified') {
      if (questionKey === 'q2') {
        try {
          const m = await guild.members.fetch(appData.discordUserId)
          await m.roles.add(LEADERSHIP_ROLE_ID)
          await apiPatch(`/api/leadership/applications/${applicationId}`, { discordRoleGranted: true })
          await interaction.followUp({ content: `✅ **${qLabel}** verified by <@${interaction.user.id}>. Discord Leadership role granted to <@${appData.discordUserId}>.` }).catch(() => {})
        } catch (err) {
          await interaction.followUp({ content: `⚠️ **${qLabel}** verified but role assignment failed: ${err.message}` }).catch(() => {})
        }
      }
      if (questionKey === 'q4') {
        try {
          await apiPost('/api/leadership/grant-website', { discordUserId: appData.discordUserId })
          await apiPatch(`/api/leadership/applications/${applicationId}`, { websiteRoleGranted: true })
          await interaction.followUp({ content: `✅ **${qLabel}** verified by <@${interaction.user.id}>. Website leadership access granted to <@${appData.discordUserId}>.` }).catch(() => {})
        } catch (err) {
          await interaction.followUp({ content: `⚠️ **${qLabel}** verified but website grant failed: ${err.message}` }).catch(() => {})
        }
      }
    } else {
      await interaction.followUp({ content: `❌ **${qLabel}** denied by <@${interaction.user.id}>.` }).catch(() => {})
    }

    // Disable the used select menu
    const rows = interaction.message.components.map(row => {
      const newRow = new ActionRowBuilder()
      newRow.addComponents(row.components.map(comp => {
        if (comp.customId === interaction.customId) {
          return StringSelectMenuBuilder.from(comp).setDisabled(true).setPlaceholder(`${qLabel} — ${decision === 'verified' ? '✅ Verified' : '❌ Denied'}`)
        }
        return StringSelectMenuBuilder.from(comp)
      }))
      return newRow
    })
    await interaction.message.edit({ components: rows }).catch(() => {})
    return
  }
})

// ─── Message handler (text responses + screenshots) ───────────────────────────

const serverConfigCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

async function getVerifyConfig(guildId) {
  const cached = serverConfigCache.get(guildId)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data
  try {
    const res = await fetch(`${API}/api/verify/servers/${guildId}`, { headers: { 'x-bot-secret': SECRET } })
    if (!res.ok) { serverConfigCache.set(guildId, { ts: Date.now(), data: null }); return null }
    const data = await res.json()
    serverConfigCache.set(guildId, { ts: Date.now(), data: data.server })
    return data.server
  } catch { return null }
}

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return
  if (!message.guild) return

  const channelId = message.channelId
  const session   = ticketSessions.get(channelId)

  // ── Handle awaited text responses ──────────────────────────────────────────
  if (session && message.author.id === session.userId && awaitingText.has(channelId)) {
    const field   = awaitingText.get(channelId)
    const content = message.content.trim()
    awaitingText.delete(channelId)
    await message.react('✅').catch(() => {})

    if (field === 'projectName') {
      session.founderProjectName = content
      await founderAskQ2(message.channel)

    } else if (field === 'targetKingdom') {
      session.founderTargetKingdom = content
      await founderAskQ3(message.channel)

    } else if (field === 'sleeperKingdom') {
      session.founderSleeperKingdom = content
      await founderAskQ4(message.channel)

    } else if (field === 'guildId') {
      session.founderGuildId = content
      await founderAskQ5(message.channel, session)

    } else if (field === 'serverLink') {
      session.founderServerLink = content
      await founderSendSummary(message.channel, session)
    }
    return
  }

  // ── Handle "BOT INSTALLED" ─────────────────────────────────────────────────
  if (session && message.author.id === session.userId && awaitingBotInstall.has(channelId)) {
    if (message.content.trim().toUpperCase() === 'BOT INSTALLED') {
      const attempts = awaitingBotInstall.get(channelId)
      awaitingBotInstall.delete(channelId)
      await message.react('🔍').catch(() => {})

      const guildId = session.founderGuildId
      let botInServer = false
      try {
        const g = await client.guilds.fetch(guildId).catch(() => null)
        botInServer = !!g
      } catch { /* not in server */ }

      if (botInServer) {
        try {
          const g = client.guilds.cache.get(guildId) ?? await client.guilds.fetch(guildId)
          session.founderGuildName = g?.name ?? guildId
        } catch { session.founderGuildName = guildId }
        await message.channel.send({
          embeds: [new EmbedBuilder()
            .setTitle('✅ Bot Confirmed!')
            .setDescription('The TFN Bot has been found in your server. Continuing...')
            .setColor(0x22c55e)],
        })
        await founderAskQ6(message.channel)
      } else {
        const newAttempts = attempts + 1
        if (newAttempts >= 2) {
          // Ping staff and pause
          awaitingBotInstall.delete(channelId)
          await message.channel.send({
            content: `<@&${STAFF_ROLE_ID}>`,
            embeds: [new EmbedBuilder()
              .setTitle('⚠️ Bot Install — Staff Needed')
              .setDescription(
                `The bot could not be confirmed in server ID \`${guildId}\` after 2 attempts.\n\n` +
                `A staff member will assist. The ticket is paused.\n\n` +
                `**Staff:** once resolved, use \`/continue ${message.channel.name}\` to resume.`
              )
              .setColor(0xef4444)],
          })
        } else {
          awaitingBotInstall.set(channelId, newAttempts)
          await message.channel.send({
            embeds: [new EmbedBuilder()
              .setTitle('❌ Bot Not Found')
              .setDescription(
                `Still could not find the bot in server \`${guildId}\`. Please double-check the server ID and make sure the bot has been added.\n\n` +
                `Bot invite link:\nhttps://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&scope=bot%20applications.commands&permissions=8\n\n` +
                `Type **BOT INSTALLED** again once it's added.`
              )
              .setColor(0xf59e0b)],
          })
        }
      }
    }
    return
  }

  // ── Screenshot collection for leadership screenshots ───────────────────────
  const images = message.attachments.filter(a =>
    a.contentType?.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(a.name ?? '')
  )

  if (images.size && awaitingScreenshots.has(channelId)) {
    if (session && message.author.id === session.userId) {
      images.forEach(img => session.screenshotUrls?.push(img.url))
      await message.react('✅').catch(() => {})
      return
    }
  }

  // ── Governor verification ──────────────────────────────────────────────────
  if (!images.size) return
  const guildId = message.guild.id
  const config = await getVerifyConfig(guildId)
  if (!config) return
  if (!config.active) return
  if (!config.channelId) return
  if (message.channelId !== config.channelId) return

  const image = images.first()
  try {
    const res = await fetch(`${API}/api/verify/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-secret': SECRET },
      body: JSON.stringify({
        guildId,
        discordUserId:   message.author.id,
        discordUsername: message.author.username,
        imageUrl:        image.url,
      }),
    })
    const data = await res.json()
    const { result, govName, allianceTag, roleId, reason, staffRoleId } = data

    if (result === 'success') {
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
    serverConfigCache.delete(guildId)
  } catch (err) {
    console.error('[verify]', err)
  }
})

client.once(Events.ClientReady, async () => {
  console.log(`✅ TFN Bot online as ${client.user.tag}`)
  const guild = client.guilds.cache.first()
  if (guild) await ensureLeadershipMessage(guild)
})

client.login(process.env.DISCORD_BOT_TOKEN)
