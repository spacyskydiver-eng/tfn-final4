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
    GatewayIntentBits.GuildMembers, // needed for role management
  ],
})

const API    = process.env.APP_URL
const SECRET = process.env.BOT_API_SECRET

// ─── IDs ──────────────────────────────────────────────────────────────────────
const STAFF_ROLE_ID              = '1164685988468109354'
const LEADERSHIP_ROLE_ID         = '1465017809313464350'
const APPLICATION_CHANNEL_ID     = '1164686107234013296'
const REVIEW_CHANNEL_ID          = process.env.DISCORD_LEADERSHIP_REVIEW_CHANNEL_ID // set in .env

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

// ─── Leadership Ticket State ──────────────────────────────────────────────────

// channelId → { applicationId, userId, username, step, projectId, projectName,
//               isFounder, screenshotUrls, leaderPermDiscord, leaderPermWebsite }
const ticketSessions = new Map()

// channels currently waiting for screenshot attachments
const awaitingScreenshots = new Set()

// ─── Post/update the persistent "Apply for Leadership" message ───────────────

async function ensureLeadershipMessage(guild) {
  try {
    const channel = await guild.channels.fetch(APPLICATION_CHANNEL_ID).catch(() => null)
    if (!channel?.isTextBased()) return

    const embed = new EmbedBuilder()
      .setTitle('🏆 Apply for Project Leadership')
      .setDescription(
        'Apply to be recognised as leadership for your RoK Restart Project on the **TFN Discord server** and **TFN website**.\n\n' +
        'Use the menu below to open a private application ticket.'
      )
      .setColor(0x7c3aed)
      .addFields(
        {
          name: 'What you can get',
          value:
            '• **Discord:** Leadership role in this server\n' +
            '• **Website:** Leadership access (Ark of Osiris, future tools)',
          inline: false,
        },
        {
          name: 'Requirements',
          value:
            '• Your project must have the **TFN Bot** installed in its own Discord server\n' +
            '• You must be the project founder **OR** have the project leader\'s permission',
          inline: false,
        },
      )
      .setFooter({ text: 'TFN Leadership System · Applications are reviewed by staff' })

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('leadership_apply')
        .setPlaceholder('📋 Click here to apply for leadership...')
        .addOptions({
          label: 'Apply for Leadership',
          value: 'apply',
          description: 'Opens a private ticket to start your application',
          emoji: '🏆',
        })
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

// ─── Q1: Project selection ────────────────────────────────────────────────────

async function sendQ1(channel, session) {
  let projects = []
  try {
    const data = await apiGet('/api/restart-projects')
    projects = data.projects ?? []
  } catch { /* no projects */ }

  if (projects.length === 0) {
    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle('⚠️ No Projects Available')
        .setDescription('There are currently no configured restart projects. Please contact staff.')
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
      description: p.guildName,
    })))

  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 1 of 4')
      .setDescription('**Which restart project are you applying as leadership for?**')
      .setColor(0x7c3aed)
      .setFooter({ text: 'Select from the dropdown below' })],
    components: [new ActionRowBuilder().addComponents(select)],
  })

  session.step = 1
}

// ─── Q2: Are you the founder? ─────────────────────────────────────────────────

async function sendQ2(channel, session) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 2 of 4')
      .setDescription('**Are you the project founder?**\n\nIf yes, you will be asked to provide proof (screenshots showing your roles in the project\'s Discord server).')
      .setColor(0x7c3aed)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('leadership_q2:yes').setLabel('Yes — I am the founder').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('leadership_q2:no').setLabel('No — I am not the founder').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    )],
  })
  session.step = 2
}

// ─── Q2.1: Prompt for screenshots ────────────────────────────────────────────

async function sendQ2_1(channel, session) {
  const doneBtn = new ButtonBuilder()
    .setCustomId('leadership_q2_1_done')
    .setLabel("I've uploaded all screenshots")
    .setStyle(ButtonStyle.Primary)
    .setEmoji('✅')

  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 2.1 — Proof of Founder Status')
      .setDescription(
        '**Please send screenshot(s) as messages in this channel** showing your roles in the project\'s Discord server.\n\n' +
        'The screenshots should clearly show:\n' +
        '• Your username\n' +
        '• Your roles (e.g. Owner, Leader, Admin)\n\n' +
        'Upload one or more images, then click the button below when done.'
      )
      .setColor(0x7c3aed)
      .setFooter({ text: 'Attach screenshots as images in this channel, then click the button' })],
    components: [new ActionRowBuilder().addComponents(doneBtn)],
  })

  awaitingScreenshots.add(channel.id)
  session.step = 3
}

// ─── Q3: Leader permission for Discord ───────────────────────────────────────

async function sendQ3(channel, session) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 3 of 4')
      .setDescription(
        '**Has the leader of your project given permission for you to apply as project leadership in the TFN Discord server?**\n\n' +
        'This grants you the Leadership role in this Discord server.'
      )
      .setColor(0x7c3aed)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('leadership_q3:yes').setLabel('Yes — the leader has given permission').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('leadership_q3:no').setLabel('No — I do not have permission').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    )],
  })
  session.step = 4
}

// ─── Q4: Leader permission for website ────────────────────────────────────────

async function sendQ4(channel, session) {
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle('Question 4 of 4')
      .setDescription(
        '**Has the leader of your project given permission for you to apply as project leadership on the TFN website?**\n\n' +
        'This grants you leadership access on the TFN website (Ark of Osiris, future tools).\n\n' +
        '⚠️ You must have logged in to the TFN website with Discord at least once for this to work.'
      )
      .setColor(0x7c3aed)],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('leadership_q4:yes').setLabel('Yes — the leader has given permission').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId('leadership_q4:no').setLabel('No — I do not have permission').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    )],
  })
  session.step = 5
}

// ─── Summary + Deployment Phase button ───────────────────────────────────────

async function sendSummary(channel, session) {
  session.step = 6

  // Save full answers to DB
  await apiPatch(`/api/leadership/applications/${session.applicationId}`, {
    projectId:         session.projectId,
    isFounder:         session.isFounder,
    screenshotUrls:    session.screenshotUrls,
    leaderPermDiscord: session.leaderPermDiscord,
    leaderPermWebsite: session.leaderPermWebsite,
    status:            'reviewing',
  }).catch(err => console.error('[leadership] Failed to update application:', err))

  const lines = [
    `**Q1 — Project:** ${session.projectName ?? '—'}`,
    `**Q2 — Project Founder:** ${session.isFounder ? 'Yes ✅' : 'No ❌'}`,
  ]
  if (session.isFounder) {
    lines.push(`**Q2.1 — Screenshots:** ${session.screenshotUrls.length} uploaded`)
  } else {
    lines.push(`**Q3 — Discord Leadership Permission:** ${session.leaderPermDiscord ? 'Yes ✅' : 'No ❌'}`)
  }
  lines.push(`**Q4 — Website Leadership Permission:** ${session.leaderPermWebsite ? 'Yes ✅' : 'No ❌'}`)

  const deployBtn = new ButtonBuilder()
    .setCustomId(`leadership_deploy:${session.applicationId}`)
    .setLabel('✅ Deployment Phase (Staff Only)')
    .setStyle(ButtonStyle.Success)

  await channel.send({
    content: `<@&${STAFF_ROLE_ID}> — New leadership application ready for review.`,
    embeds: [new EmbedBuilder()
      .setTitle('📋 Application Summary')
      .setDescription(lines.join('\n'))
      .setColor(0x7c3aed)
      .addFields({ name: 'Applicant', value: `<@${session.userId}> (${session.username})`, inline: true })
      .setFooter({ text: 'Staff: Click "Deployment Phase" to close this ticket and begin verification' })
      .setTimestamp()],
    components: [new ActionRowBuilder().addComponents(deployBtn)],
  })
}

// ─── Bot ready ────────────────────────────────────────────────────────────────

client.once(Events.ClientReady, async () => {
  console.log(`✅ TFN Bot online as ${client.user.tag}`)
  const guildId = process.env.DISCORD_GUILD_ID
  if (guildId) {
    const guild = await client.guilds.fetch(guildId).catch(() => null)
    if (guild) await ensureLeadershipMessage(guild)
  }
})

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

        const channelName  = `ticket-${productKey.toLowerCase()}`
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

    } catch (err) {
      console.error(`[${commandName}]`, err)
      return interaction.editReply(`❌ Error: ${err.message}`)
    }
    return
  }

  // ── Select menu: Apply for leadership ──────────────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === 'leadership_apply') {
    await interaction.deferUpdate()
    const guild = interaction.guild
    if (!guild) return interaction.followUp({ content: '❌ This must be used in the TFN server.', ephemeral: true })

    // Check for existing open ticket from this user
    const existing = ticketSessions
    for (const [, s] of existing) {
      if (s.userId === interaction.user.id) {
        return interaction.followUp({ content: '❌ You already have an open leadership application. Please complete it first.', ephemeral: true })
      }
    }

    try {
      // Create ticket channel
      const shortId    = Date.now().toString(36).toUpperCase()
      const channelName = `leadership-${shortId}`
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        topic: `Leadership application — ${interaction.user.tag}`,
        permissionOverwrites: [
          { id: guild.roles.everyone.id,   deny:  [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id,        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: STAFF_ROLE_ID,              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
        ],
      })

      // Create DB record
      const { application } = await apiPost('/api/leadership/applications', {
        discordUserId:   interaction.user.id,
        discordUsername: interaction.user.tag,
        ticketChannelId: ticketChannel.id,
      })

      // Init session
      const session = {
        applicationId:   application.id,
        userId:          interaction.user.id,
        username:        interaction.user.tag,
        step:            0,
        projectId:       null,
        projectName:     null,
        isFounder:       null,
        screenshotUrls:  [],
        leaderPermDiscord: null,
        leaderPermWebsite: null,
      }
      ticketSessions.set(ticketChannel.id, session)

      // Welcome message
      await ticketChannel.send({
        content: `Welcome <@${interaction.user.id}>! <@&${STAFF_ROLE_ID}>`,
        embeds: [new EmbedBuilder()
          .setTitle('🏆 Leadership Application')
          .setDescription(
            `Hi **${interaction.user.username}**! This is your private leadership application ticket.\n\n` +
            `Please answer the following questions. A staff member will review your application.\n\n` +
            `_If you need to stop, your answers are saved automatically._`
          )
          .setColor(0x7c3aed)],
      })

      // Send Q1
      await sendQ1(ticketChannel, session)

      return interaction.followUp({ content: `✅ Your application ticket has been created: <#${ticketChannel.id}>`, ephemeral: true })
    } catch (err) {
      console.error('[leadership/apply]', err)
      return interaction.followUp({ content: `❌ Failed to create ticket: ${err.message}`, ephemeral: true })
    }
  }

  // ── Select menu: Q1 project selection ──────────────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId === 'leadership_q1_select') {
    const session = ticketSessions.get(interaction.channelId)
    if (!session || interaction.user.id !== session.userId) {
      return interaction.reply({ content: '❌ This is not your application.', ephemeral: true })
    }
    await interaction.deferUpdate()
    const projectId = interaction.values[0]
    const selectedOption = interaction.component.options?.find(o => o.value === projectId)
    session.projectId   = projectId
    session.projectName = selectedOption?.label ?? projectId
    await interaction.message.edit({
      embeds: [new EmbedBuilder()
        .setTitle('Question 1 of 4')
        .setDescription('**Which restart project are you applying as leadership for?**')
        .setColor(0x7c3aed)
        .setFooter({ text: `Your answer: ${session.projectName}` })],
      components: [],
    }).catch(() => {})
    await sendQ2(interaction.channel, session)
    return
  }

  // ── Button: Q2 founder ────────────────────────────────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith('leadership_q2:')) {
    const session = ticketSessions.get(interaction.channelId)
    if (!session || interaction.user.id !== session.userId) {
      return interaction.reply({ content: '❌ This is not your application.', ephemeral: true })
    }
    await interaction.deferUpdate()
    const isFounder = interaction.customId.endsWith(':yes')
    session.isFounder = isFounder
    await interaction.message.edit({
      embeds: [new EmbedBuilder()
        .setTitle('Question 2 of 4')
        .setDescription('**Are you the project founder?**')
        .setColor(0x7c3aed)
        .setFooter({ text: `Your answer: ${isFounder ? 'Yes ✅' : 'No ❌'}` })],
      components: [],
    }).catch(() => {})
    if (isFounder) {
      await sendQ2_1(interaction.channel, session)
    } else {
      await sendQ3(interaction.channel, session)
    }
    return
  }

  // ── Button: Q2.1 done uploading screenshots ────────────────────────────────
  if (interaction.isButton() && interaction.customId === 'leadership_q2_1_done') {
    const session = ticketSessions.get(interaction.channelId)
    if (!session || interaction.user.id !== session.userId) {
      return interaction.reply({ content: '❌ This is not your application.', ephemeral: true })
    }
    awaitingScreenshots.delete(interaction.channelId)
    await interaction.deferUpdate()
    const count = session.screenshotUrls.length
    await interaction.message.edit({
      embeds: [new EmbedBuilder()
        .setTitle('Question 2.1 — Proof of Founder Status')
        .setDescription('**Screenshots uploaded**')
        .setColor(0x7c3aed)
        .setFooter({ text: `${count} screenshot(s) received` })],
      components: [],
    }).catch(() => {})
    if (count === 0) {
      await interaction.channel.send('⚠️ No screenshots were detected. Please make sure to send image attachments before clicking done. The application will continue — staff will note the missing proof.')
    }
    await sendQ4(interaction.channel, session)
    return
  }

  // ── Button: Q3 Discord permission ─────────────────────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith('leadership_q3:')) {
    const session = ticketSessions.get(interaction.channelId)
    if (!session || interaction.user.id !== session.userId) {
      return interaction.reply({ content: '❌ This is not your application.', ephemeral: true })
    }
    await interaction.deferUpdate()
    session.leaderPermDiscord = interaction.customId.endsWith(':yes')
    await interaction.message.edit({
      embeds: [new EmbedBuilder()
        .setTitle('Question 3 of 4')
        .setDescription('**Has the leader given permission for Discord leadership?**')
        .setColor(0x7c3aed)
        .setFooter({ text: `Your answer: ${session.leaderPermDiscord ? 'Yes ✅' : 'No ❌'}` })],
      components: [],
    }).catch(() => {})
    await sendQ4(interaction.channel, session)
    return
  }

  // ── Button: Q4 website permission ─────────────────────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith('leadership_q4:')) {
    const session = ticketSessions.get(interaction.channelId)
    if (!session || interaction.user.id !== session.userId) {
      return interaction.reply({ content: '❌ This is not your application.', ephemeral: true })
    }
    await interaction.deferUpdate()
    session.leaderPermWebsite = interaction.customId.endsWith(':yes')
    await interaction.message.edit({
      embeds: [new EmbedBuilder()
        .setTitle('Question 4 of 4')
        .setDescription('**Has the leader given permission for website leadership?**')
        .setColor(0x7c3aed)
        .setFooter({ text: `Your answer: ${session.leaderPermWebsite ? 'Yes ✅' : 'No ❌'}` })],
      components: [],
    }).catch(() => {})
    await sendSummary(interaction.channel, session)
    return
  }

  // ── Button: Deployment Phase (staff only) ─────────────────────────────────
  if (interaction.isButton() && interaction.customId.startsWith('leadership_deploy:')) {
    const applicationId = interaction.customId.split(':')[1]
    const member = interaction.member
    if (!member?.roles?.cache?.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Only staff can use this button.', ephemeral: true })
    }

    await interaction.deferUpdate()

    // Load session from DB if not in memory
    let session = null
    for (const [, s] of ticketSessions) {
      if (s.applicationId === applicationId) { session = s; break }
    }
    let appData = null
    try {
      const { application } = await apiGet(`/api/leadership/applications/${applicationId}`)
      appData = application
    } catch (err) {
      console.error('[leadership/deploy] fetch app failed:', err)
    }

    if (!appData) {
      return interaction.followUp({ content: '❌ Could not load application data.', ephemeral: true })
    }

    // Update status to closed
    await apiPatch(`/api/leadership/applications/${applicationId}`, { status: 'closed' }).catch(() => {})

    // Send summary to review channel
    const guild  = interaction.guild
    const review = REVIEW_CHANNEL_ID ? await guild.channels.fetch(REVIEW_CHANNEL_ID).catch(() => null) : null

    if (review?.isTextBased()) {
      const reviewLines = [
        `**Q1 — Project:** ${appData.project?.name ?? appData.projectId ?? '—'}`,
        `**Q2 — Project Founder:** ${appData.isFounder ? 'Yes ✅' : 'No ❌'}`,
      ]
      if (appData.isFounder) {
        const screenshots = Array.isArray(appData.screenshotUrls) ? appData.screenshotUrls : []
        reviewLines.push(`**Q2.1 — Screenshots:** ${screenshots.length} uploaded`)
      } else {
        reviewLines.push(`**Q3 — Discord Leadership Permission:** ${appData.leaderPermDiscord ? 'Yes ✅' : 'No ❌'}`)
      }
      reviewLines.push(`**Q4 — Website Leadership Permission:** ${appData.leaderPermWebsite ? 'Yes ✅' : 'No ❌'}`)

      // Build verification rows — one per verifiable question
      const rows = []

      // Q2 verification (only if they claimed to be founder)
      if (appData.isFounder) {
        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`leadership_verify:q2:${applicationId}`)
            .setPlaceholder('Verify Q2 — Proof of founder status')
            .addOptions(
              { label: 'Q2 — Verified (grant Discord leadership role)', value: 'verified', emoji: '✅' },
              { label: 'Q2 — Denied (cannot confirm founder)', value: 'denied', emoji: '❌' },
            )
        ))
      }

      // Q3 verification (only if not founder and claimed yes)
      if (!appData.isFounder && appData.leaderPermDiscord) {
        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`leadership_verify:q3:${applicationId}`)
            .setPlaceholder('Verify Q3 — Discord leadership permission')
            .addOptions(
              { label: 'Q3 — Verified (grant Discord leadership role)', value: 'verified', emoji: '✅' },
              { label: 'Q3 — Denied (cannot confirm permission)', value: 'denied', emoji: '❌' },
            )
        ))
      }

      // Q4 verification (only if they claimed yes)
      if (appData.leaderPermWebsite) {
        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`leadership_verify:q4:${applicationId}`)
            .setPlaceholder('Verify Q4 — Website leadership permission')
            .addOptions(
              { label: 'Q4 — Verified (grant website leadership role)', value: 'verified', emoji: '✅' },
              { label: 'Q4 — Denied (cannot confirm permission)', value: 'denied', emoji: '❌' },
            )
        ))
      }

      await review.send({
        content: `<@&${STAFF_ROLE_ID}> — Leadership application closed. Please verify each question below.`,
        embeds: [new EmbedBuilder()
          .setTitle(`📋 Leadership Application — ${appData.discordUsername}`)
          .setDescription(reviewLines.join('\n'))
          .setColor(0x7c3aed)
          .addFields(
            { name: 'Applicant',  value: `<@${appData.discordUserId}> (${appData.discordUsername})`, inline: true },
            { name: 'Project',    value: appData.project?.name ?? '—', inline: true },
            { name: 'App ID',     value: `\`${applicationId.slice(0, 12)}\``, inline: true },
          )
          .setFooter({ text: 'Use the dropdowns below to verify each question and grant roles' })
          .setTimestamp()],
        components: rows,
      }).catch(err => console.error('[leadership] Failed to send to review channel:', err))

      // If there were screenshots, post them
      const screenshots = Array.isArray(appData.screenshotUrls) ? appData.screenshotUrls : []
      if (screenshots.length > 0) {
        await review.send({
          embeds: [new EmbedBuilder()
            .setTitle('📎 Submitted Screenshots')
            .setDescription(screenshots.map((u, i) => `[Screenshot ${i + 1}](${u})`).join('\n'))
            .setColor(0x6366f1)],
        }).catch(() => {})
      }
    }

    // Countdown + close ticket
    const ticketChannel = interaction.channel
    await ticketChannel.send({
      embeds: [new EmbedBuilder()
        .setTitle('⏳ Ticket Closing')
        .setDescription('This ticket will be closed in **60 seconds**. Your application has been received and is being reviewed by staff.\n\nYou will be contacted via DM or a new channel once a decision is made.')
        .setColor(0xf59e0b)],
    })

    setTimeout(async () => {
      // Remove applicant's access and rename channel
      const channelId = ticketChannel.id
      const sess = ticketSessions.get(channelId)
      if (sess) {
        ticketSessions.delete(channelId)
        awaitingScreenshots.delete(channelId)
      }
      await ticketChannel.delete(`Leadership ticket closed by staff`).catch(() => {
        // If delete fails, just lock it
        ticketChannel.permissionOverwrites.set([
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] },
        ]).catch(() => {})
      })
    }, 60_000)

    return
  }

  // ── Select menu: Staff verification (q2/q3/q4) ────────────────────────────
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('leadership_verify:')) {
    const [, questionKey, applicationId] = interaction.customId.split(':')
    const decision = interaction.values[0] // "verified" or "denied"

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
      console.error('[leadership/verify] fetch app failed:', err)
      return interaction.followUp({ content: '❌ Could not load application.', ephemeral: true })
    }

    const patchPayload = {}
    if (questionKey === 'q2') patchPayload.staffVerifiedQ2 = decision
    if (questionKey === 'q3') patchPayload.staffVerifiedQ3 = decision
    if (questionKey === 'q4') patchPayload.staffVerifiedQ4 = decision

    await apiPatch(`/api/leadership/applications/${applicationId}`, patchPayload).catch(() => {})

    const guild  = interaction.guild
    const qLabel = { q2: 'Q2 (Founder Proof)', q3: 'Q3 (Discord Permission)', q4: 'Q4 (Website Permission)' }[questionKey] ?? questionKey

    if (decision === 'verified') {
      // Grant Discord leadership role for Q2 or Q3
      if (questionKey === 'q2' || questionKey === 'q3') {
        try {
          const member = await guild.members.fetch(appData.discordUserId)
          await member.roles.add(LEADERSHIP_ROLE_ID)
          await apiPatch(`/api/leadership/applications/${applicationId}`, { discordRoleGranted: true })
          await interaction.followUp({
            content: `✅ **${qLabel}** verified by <@${interaction.user.id}>. Discord leadership role granted to <@${appData.discordUserId}>.`,
          }).catch(() => {})
        } catch (err) {
          console.error('[leadership/verify] role assign failed:', err)
          await interaction.followUp({
            content: `⚠️ **${qLabel}** verified but failed to assign Discord role: ${err.message}. Please assign manually.`,
          }).catch(() => {})
        }
      }

      // Grant website leadership role for Q4
      if (questionKey === 'q4') {
        try {
          await apiPost('/api/leadership/grant-website', { discordUserId: appData.discordUserId })
          await apiPatch(`/api/leadership/applications/${applicationId}`, { websiteRoleGranted: true })
          await interaction.followUp({
            content: `✅ **${qLabel}** verified by <@${interaction.user.id}>. Website leadership role granted to <@${appData.discordUserId}>.`,
          }).catch(() => {})
        } catch (err) {
          await interaction.followUp({
            content: `⚠️ **${qLabel}** verified but failed to grant website role: ${err.message}. The user may need to log in to the website first.`,
          }).catch(() => {})
        }
      }
    } else {
      // Denied
      await interaction.followUp({
        content: `❌ **${qLabel}** denied by <@${interaction.user.id}>.`,
      }).catch(() => {})
    }

    // Disable the select menu that was just used
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

// ─── Screenshot collection for leadership tickets ────────────────────────────

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

  const images = message.attachments.filter(a =>
    a.contentType?.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(a.name ?? '')
  )
  if (!images.size) return

  // ── Collect screenshots for leadership application ─────────────────────────
  if (awaitingScreenshots.has(message.channelId)) {
    const session = ticketSessions.get(message.channelId)
    if (session && message.author.id === session.userId) {
      images.forEach(img => session.screenshotUrls.push(img.url))
      await message.react('✅').catch(() => {})
      return
    }
  }

  // ── Governor verification ─────────────────────────────────────────────────
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

client.login(process.env.DISCORD_BOT_TOKEN)
