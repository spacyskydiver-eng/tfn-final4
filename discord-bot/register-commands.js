// Run once to register slash commands: node register-commands.js
import 'dotenv/config'
import { REST, Routes, SlashCommandBuilder } from 'discord.js'

const commands = [
  new SlashCommandBuilder()
    .setName('kvklist')
    .setDescription('List all pending KvK setups awaiting bot deployment'),

  new SlashCommandBuilder()
    .setName('kvkstatus')
    .setDescription('Update a KvK status')
    .addStringOption(o => o.setName('kvk_id').setDescription('KvK ID').setRequired(true))
    .addStringOption(o => o
      .setName('status')
      .setDescription('New status')
      .setRequired(true)
      .addChoices(
        { name: 'Pending',   value: 'pending'   },
        { name: 'Active',    value: 'active'    },
        { name: 'Paused',    value: 'paused'    },
        { name: 'Completed', value: 'completed' },
      )
    ),

  new SlashCommandBuilder()
    .setName('kvkscan')
    .setDescription('Trigger an immediate scan for a KvK')
    .addStringOption(o => o.setName('kvk_id').setDescription('KvK ID').setRequired(true))
    .addStringOption(o => o
      .setName('type')
      .setDescription('Scan type')
      .setRequired(true)
      .addChoices(
        { name: 'DKP',     value: 'dkp'     },
        { name: 'Honor',   value: 'honor'   },
        { name: 'Pre-KvK', value: 'pre-kvk' },
        { name: 'All',     value: 'all'     },
      )
    ),

  new SlashCommandBuilder()
    .setName('kvkgoal')
    .setDescription('Set a DKP goal for a player')
    .addStringOption(o => o.setName('kvk_id').setDescription('KvK ID').setRequired(true))
    .addStringOption(o => o.setName('gov_id').setDescription('Governor ID').setRequired(true))
    .addNumberOption(o => o.setName('dkp_goal').setDescription('DKP goal amount').setRequired(true)),

  new SlashCommandBuilder()
    .setName('activate')
    .setDescription('Activate your TFN Bot order with your product key — opens a private ticket with staff')
    .addStringOption(o =>
      o.setName('key')
        .setDescription('Your product key (e.g. TFN-XXXX-XXXX-XXXX)')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('continue')
    .setDescription('(Staff only) Resume a paused founder ticket that is waiting on bot installation')
    .addStringOption(o =>
      o.setName('ticket')
        .setDescription('Ticket channel name (e.g. founder-ABC123)')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('locate')
    .setDescription('Find the map coordinates of a governor by their ID')
    .addStringOption(o =>
      o.setName('govid')
        .setDescription('Governor ID (e.g. 209179204)')
        .setRequired(true)
    ),
].map(c => c.toJSON())

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN)

rest.put(
  Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
  { body: commands },
).then(() => console.log('✅ Slash commands registered'))
  .catch(console.error)
