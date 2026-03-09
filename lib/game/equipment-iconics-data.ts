export type IconicTierType = 'base_stat' | 'percent_stat' | 'flat_stat' | 'special'
export type KvkSeason = 'kvk1_2' | 'kvk3' | 'soc'

export interface IconicTier {
  type: IconicTierType
  stat?: string
  values?: Record<KvkSeason, number>
  value?: number
  crit_bonus?: number | Record<string, number>
  crit_buff?: number
  description?: string
  name?: string
}

export interface IconicDef {
  slot: string
  tiers: Record<string, IconicTier>
}

export const ICONIC_DATA: Record<string, IconicDef> = {
  "Sacred Dominion": {
    "slot": "weapon",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Cavalry Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Defense Ignored",
        "value": 2.5,
        "crit_buff": 1
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 1000,
        "crit_buff": 300
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 3,
        "crit_buff": 1
      },
      "5": {
        "type": "special",
        "name": "Furious Strike",
        "description": "10% chance on basic attack to gain a {value}% damage boost for 2s.",
        "values": {
          "value": 6.5
        },
        "crit_bonus": {
          "value": 2
        }
      }
    }
  },
  "Hammer of the Sun and Moon": {
    "slot": "weapon",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Infantry Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Health Ignored",
        "value": 2.5,
        "crit_buff": 1
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 1000,
        "crit_buff": 300
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 3,
        "crit_buff": 1
      },
      "5": {
        "type": "special",
        "name": "Furious Strike",
        "description": "10% chance on basic attack to gain a {value}% damage boost for 2s.",
        "values": {
          "value": 6.5
        },
        "crit_bonus": {
          "value": 2
        }
      }
    }
  },
  "The Hydra's Blast": {
    "slot": "weapon",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Archer Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Defense Ignored",
        "value": 3,
        "crit_buff": 1
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 1000,
        "crit_buff": 300
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 2.5,
        "crit_buff": 1
      },
      "5": {
        "type": "special",
        "name": "Furious Strike",
        "description": "10% chance on basic attack to gain a {value}% damage boost for 2s.",
        "values": {
          "value": 6.5
        },
        "crit_bonus": {
          "value": 2
        }
      }
    }
  },
  "Lance of the Hellish Wasteland": {
    "slot": "weapon",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Cavalry Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Defense Ignored",
        "value": 2,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 800,
        "crit_buff": 240
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 2,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Furious Strike",
        "description": "10% chance on basic attack to gain a {value}% damage boost for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Shield of the Eternal Empire": {
    "slot": "weapon",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Infantry Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Health Ignored",
        "value": 2,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 800,
        "crit_buff": 240
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 2,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Furious Strike",
        "description": "10% chance on basic attack to gain a {value}% damage boost for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Dragon's Breath Bow": {
    "slot": "weapon",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Archer Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Defense Ignored",
        "value": 2,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 800,
        "crit_buff": 240
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 2,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Furious Strike",
        "description": "10% chance on basic attack to gain a {value}% damage boost for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Scepter of the Glorious Goddess": {
    "slot": "weapon",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Troop Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Defense Ignored",
        "value": 2,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 800,
        "crit_buff": 240
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 2,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Furious Strike",
        "description": "10% chance on basic attack to gain a {value}% damage boost for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Twilight Epiphany": {
    "slot": "weapon",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Troop Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Defense Ignored",
        "value": 2,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 800,
        "crit_buff": 240
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 2,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Furious Strike",
        "description": "10% chance on basic attack to gain a {value}% damage boost for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Pride of the Khan": {
    "slot": "helmet",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Cavalry Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Cavalry Attack",
        "value": 1.5,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 650,
        "crit_buff": 200
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1.5,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Shattering Strike",
        "description": "10% chance on basic attack to increase next skill damage dealt by {value}%.",
        "values": {
          "value": 6.5
        },
        "crit_bonus": {
          "value": 2
        }
      }
    }
  },
  "Helm of the Conqueror": {
    "slot": "helmet",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Infantry Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Infantry Health",
        "value": 1.5,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 650,
        "crit_buff": 200
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1.5,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Shattering Strike",
        "description": "10% chance on basic attack to increase next skill damage dealt by {value}%.",
        "values": {
          "value": 6.5
        },
        "crit_bonus": {
          "value": 2
        }
      }
    }
  },
  "Ancestral Mask of Night": {
    "slot": "helmet",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Archer Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Archer Health",
        "value": 1.5,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 650,
        "crit_buff": 200
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1.5,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Shattering Strike",
        "description": "10% chance on basic attack to increase next skill damage dealt by {value}%.",
        "values": {
          "value": 6.5
        },
        "crit_bonus": {
          "value": 2
        }
      }
    }
  },
  "War Helm of the Hellish Wasteland": {
    "slot": "helmet",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Cavalry Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Cavalry Attack",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Shattering Strike",
        "description": "10% chance on basic attack to increase next skill damage dealt by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Gold Helm of the Eternal Empire": {
    "slot": "helmet",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Infantry Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Infantry Health",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Shattering Strike",
        "description": "10% chance on basic attack to increase next skill damage dealt by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Dragon's Breath Helm": {
    "slot": "helmet",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Archer Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Archer Health",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Shattering Strike",
        "description": "10% chance on basic attack to increase next skill damage dealt by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Diadem of the Glorious Goddess": {
    "slot": "helmet",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Troop Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Troop Health",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Shattering Strike",
        "description": "10% chance on basic attack to increase next skill damage dealt by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Fierce Wolf's Helmet": {
    "slot": "helmet",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Siege Unit Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Siege Unit Health",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Shattering Strike",
        "description": "10% chance on basic attack to increase next ranged skill damage dealt by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Shadow Legion's Retribution": {
    "slot": "chest",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Cavalry Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Health Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Counter-strike",
        "description": "10% chance when hit by basic attack to gain {value}% counterattack damage for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Hope Cloak": {
    "slot": "chest",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Infantry Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Attack Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Rallies/Garrisons",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Counter-strike",
        "description": "10% chance when hit by basic attack to gain {value}% counterattack damage for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "The Milky Way": {
    "slot": "chest",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Archer Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Defense Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Rallies/Garrisons",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Counter-strike",
        "description": "10% chance when hit by basic attack to gain {value}% counterattack damage for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Heavy Armor of the Hellish Wasteland": {
    "slot": "chest",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Cavalry Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Health Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Counter-strike",
        "description": "10% chance when hit by basic attack to gain {value}% counterattack damage for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Plate of the Eternal Empire": {
    "slot": "chest",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Infantry Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Attack Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Rallies/Garrisons",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Counter-strike",
        "description": "10% chance when hit by basic attack to gain {value}% counterattack damage for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Dragon's Breath Plate": {
    "slot": "chest",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Archer Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Defense Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Rallies/Garrisons",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Counter-strike",
        "description": "10% chance when hit by basic attack to gain {value}% counterattack damage for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Plate of the Glorious Goddess": {
    "slot": "chest",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Troop Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Defense Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Rallies/Garrisons",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Counter-strike",
        "description": "10% chance when hit by basic attack to gain {value}% counterattack damage for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Vigilant Wolf's Leather Armor": {
    "slot": "chest",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Siege Unit Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Defense Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Rallies/Garrisons",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Counter-strike",
        "description": "10% chance when hit by basic attack to gain {value}% counterattack damage for 2s.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Navar's Control": {
    "slot": "gloves",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Cavalry Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Cavalry Defense",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "Unit Cap",
        "value": 0.5,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Perplexing Ploy",
        "description": "10% chance on skill/smite damage to reduce target March Speed by 3% for 3s (stacks 3x)."
      }
    }
  },
  "Sacred Grips": {
    "slot": "gloves",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Infantry Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Infantry Attack",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "Unit Cap",
        "value": 0.5,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Seeing Red",
        "description": "10% chance when taking damage to gain 3% March Speed for 3s (stacks 3x)."
      }
    }
  },
  "Ian's Choice": {
    "slot": "gloves",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Archer Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Attack Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "Unit Cap",
        "value": 0.5,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Befuddling Blow",
        "description": "10% chance on basic attack to reduce target March Speed by 3% for 3s (stacks 3x)."
      }
    }
  },
  "Armband of the Hellish Wasteland": {
    "slot": "gloves",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Cavalry Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Cavalry Defense",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "Unit Cap",
        "value": 0.5,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Perplexing Ploy",
        "description": "10% chance on skill/smite damage to reduce target March Speed by 3% for 3s (stacks 3x)."
      }
    }
  },
  "Vambraces of the Eternal Empire": {
    "slot": "gloves",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Infantry Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Infantry Attack",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "Unit Cap",
        "value": 0.5,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Seeing Red",
        "description": "10% chance when taking damage to gain 3% March Speed for 3s (stacks 3x)."
      }
    }
  },
  "Dragon's Breath Vambraces": {
    "slot": "gloves",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Archer Base Attack",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Attack Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "Unit Cap",
        "value": 0.5,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Befuddling Blow",
        "description": "10% chance on basic attack to reduce target March Speed by 3% for 3s (stacks 3x)."
      }
    }
  },
  "Gauntlets of the Glorious Goddess": {
    "slot": "gloves",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Troop Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Attack Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "Unit Cap",
        "value": 0.5,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Unflinching",
        "description": "10% chance when taking damage to reduce attacker's Attack by 2% for 3s (stacks 3x)."
      }
    }
  },
  "Wailing Wolf's Gauntlets": {
    "slot": "gloves",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Siege Unit Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Attack Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "Unit Cap",
        "value": 0.5,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Bewildering Barrage",
        "description": "10% chance on ranged damage to reduce target March Speed by 3% for 3s (stacks 3x)."
      }
    }
  },
  "Ash of the Dawn": {
    "slot": "legs",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Cavalry Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Cavalry Health",
        "value": 2,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Wily",
        "description": "10% chance on basic attack to reduce next skill damage taken by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Eternal Night": {
    "slot": "legs",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Infantry Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Health Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Wily",
        "description": "10% chance on basic attack to reduce next skill damage taken by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Tassets of the War God": {
    "slot": "legs",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Archer Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Health Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Wily",
        "description": "10% chance on basic attack to reduce next skill damage taken by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Tassets of the Hellish Wasteland": {
    "slot": "legs",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Cavalry Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Cavalry Health",
        "value": 2,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Wily",
        "description": "10% chance on basic attack to reduce next skill damage taken by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Greaves of the Eternal Empire": {
    "slot": "legs",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Infantry Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Health Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Wily",
        "description": "10% chance on basic attack to reduce next skill damage taken by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Dragon's Breath Tassets": {
    "slot": "legs",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Archer Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Health Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Wily",
        "description": "10% chance on basic attack to reduce next skill damage taken by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Chausses of the Glorious Goddess": {
    "slot": "legs",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Troop Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Health Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Wily",
        "description": "10% chance on basic attack to reduce next skill damage taken by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Lone Wolf's Leather Tassets": {
    "slot": "legs",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Siege Unit Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Enemy Health Ignored",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 500,
        "crit_buff": 150
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Field Troops",
        "value": 1,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Wily",
        "description": "10% chance on ranged basic attack to reduce next skill damage taken by {value}%.",
        "values": {
          "value": 5
        },
        "crit_bonus": {
          "value": 1.5
        }
      }
    }
  },
  "Mountain Crushers": {
    "slot": "boots",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Cavalry Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Cavalry Attack",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "March Speed",
        "value": 5,
        "crit_buff": 1.5
      },
      "5": {
        "type": "special",
        "name": "Hurried Horsemen",
        "description": "Cavalry units gain 5% March Speed and 1% Defense outside alliance territory."
      }
    }
  },
  "Shio's Return": {
    "slot": "boots",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Infantry Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Infantry Defense",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "March Speed",
        "value": 5,
        "crit_buff": 1.5
      },
      "5": {
        "type": "special",
        "name": "Fleetfooted Footmen",
        "description": "Infantry units gain 5% March Speed and 1% Defense outside alliance territory."
      }
    }
  },
  "Commander's Boots": {
    "slot": "boots",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Archer Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Archer Attack",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "March Speed",
        "value": 5,
        "crit_buff": 1.5
      },
      "5": {
        "type": "special",
        "name": "Alacritous Archers",
        "description": "Archer units gain 5% March Speed and 1% Defense outside alliance territory."
      }
    }
  },
  "Boots of the Hellish Wasteland": {
    "slot": "boots",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Cavalry Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Cavalry Attack",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "March Speed",
        "value": 5,
        "crit_buff": 1.5
      },
      "5": {
        "type": "special",
        "name": "Hurried Horsemen",
        "description": "Cavalry units gain 5% March Speed and 1% Defense outside alliance territory."
      }
    }
  },
  "Sturdy Boots of the Eternal Empire": {
    "slot": "boots",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Infantry Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Infantry Defense",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "March Speed",
        "value": 5,
        "crit_buff": 1.5
      },
      "5": {
        "type": "special",
        "name": "Fleetfooted Footmen",
        "description": "Infantry units gain 5% March Speed and 1% Defense outside alliance territory."
      }
    }
  },
  "Dragon's Breath Boots": {
    "slot": "boots",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Archer Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Archer Attack",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "March Speed",
        "value": 5,
        "crit_buff": 1.5
      },
      "5": {
        "type": "special",
        "name": "Alacritous Archers",
        "description": "Archer units gain 5% March Speed and 1% Defense outside alliance territory."
      }
    }
  },
  "Greaves of the Glorious Goddess": {
    "slot": "boots",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Troop Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Troop Attack",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "March Speed",
        "value": 5,
        "crit_buff": 1.5
      },
      "5": {
        "type": "special",
        "name": "Holistic Haste",
        "description": "Troop gains 5% March Speed and 1% Attack outside alliance territory."
      }
    }
  },
  "Roaring Wolf's Claws": {
    "slot": "boots",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Siege Unit Base Defense",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Siege Unit Attack",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "flat_stat",
        "stat": "Unit Cap",
        "value": 300,
        "crit_buff": 90
      },
      "4": {
        "type": "percent_stat",
        "stat": "March Speed",
        "value": 5,
        "crit_buff": 1.5
      },
      "5": {
        "type": "special",
        "name": "Breakneck Besiegers",
        "description": "Siege units gain 5% March Speed and 1% Defense outside alliance territory."
      }
    }
  },
  "Accessory": {
    "slot": "accessory",
    "tiers": {
      "1": {
        "type": "base_stat",
        "stat": "Troop Base Health",
        "values": {
          "kvk1_2": 1,
          "kvk3": 2,
          "soc": 3
        },
        "crit_bonus": 1
      },
      "2": {
        "type": "percent_stat",
        "stat": "Troop Health",
        "value": 1,
        "crit_buff": 0.5
      },
      "3": {
        "type": "percent_stat",
        "stat": "Unit Cap",
        "value": 1.5,
        "crit_buff": 0.5
      },
      "4": {
        "type": "percent_stat",
        "stat": "Damage to Rallies/Garrisons",
        "value": 1.5,
        "crit_buff": 0.5
      },
      "5": {
        "type": "special",
        "name": "Divine Might",
        "description": "10% chance to gain one effect: \u00b1{value1}% normal damage dealt/taken or \u00b1{value3}% skill damage dealt/taken.",
        "values": {
          "value1": 5,
          "value2": 5,
          "value3": 5,
          "value4": 5
        },
        "crit_bonus": {
          "value1": 1.5,
          "value2": 1.5,
          "value3": 1.5,
          "value4": 1.5
        }
      }
    }
  }
}