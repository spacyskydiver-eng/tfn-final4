export interface EquipmentSetDef {
  id: string
  name: string
  pieces: string[]
  bonuses: { count: number; description: string }[]
}

export const EQUIPMENT_SETS: EquipmentSetDef[] = [
  {
    "id": "lupine_vestments",
    "name": "Lupine Vestments",
    "pieces": [
      "fierce_wolfs_helmet",
      "vigilant_wolfs_leather_armor",
      "wailing_wolfs_gauntlets",
      "lone_wolfs_leather_tassets",
      "roaring_wolfs_claws"
    ],
    "bonuses": [
      {
        "count": 2,
        "description": "Siege Unit Defence +5%"
      },
      {
        "count": 4,
        "description": "Ranged Skill Damage +5%, Ranged Smite Damage +5%"
      }
    ]
  },
  {
    "id": "hellish_wasteland",
    "name": "Hellish Wasteland Set",
    "pieces": [
      "lance_of_the_hellish_wasteland",
      "war_helm_of_the_hellish_wasteland",
      "heavy_armor_of_the_hellish_wasteland",
      "armband_of_the_hellish_wasteland",
      "tassets_of_the_hellish_wasteland",
      "boots_of_the_hellish_wasteland"
    ],
    "bonuses": [
      {
        "count": 2,
        "description": "Troop Health +3%"
      },
      {
        "count": 4,
        "description": "Counterattack Damage +3%"
      },
      {
        "count": 6,
        "description": "Cavalry Defense +5%"
      }
    ]
  },
  {
    "id": "eternal_empire",
    "name": "Eternal Empire Set",
    "pieces": [
      "shield_of_the_eternal_empire",
      "gold_helm_of_the_eternal_empire",
      "plate_of_the_eternal_empire",
      "vambraces_of_the_eternal_empire",
      "greaves_of_the_eternal_empire",
      "sturdy_boots_of_the_eternal_empire"
    ],
    "bonuses": [
      {
        "count": 2,
        "description": "Troop Defence +3%"
      },
      {
        "count": 4,
        "description": "March Speed +10%"
      },
      {
        "count": 6,
        "description": "Infantry Attack +5%"
      }
    ]
  },
  {
    "id": "dragons_breath",
    "name": "Dragon's Breath Set",
    "pieces": [
      "dragons_breath_bow",
      "dragons_breath_helm",
      "dragons_breath_plate",
      "dragons_breath_vambraces",
      "dragons_breath_tassets",
      "dragons_breath_boots"
    ],
    "bonuses": [
      {
        "count": 2,
        "description": "Troop Attack 3%"
      },
      {
        "count": 4,
        "description": "Skill Damage 3%"
      },
      {
        "count": 6,
        "description": "Archer Health 5%"
      }
    ]
  },
  {
    "id": "glorious_goddess",
    "name": "Garb of the Glorious Goddess",
    "pieces": [
      "scepter_of_the_glorious_goddess",
      "diadem_of_the_glorious_goddess",
      "plate_of_the_glorious_goddess",
      "gauntlets_of_the_glorious_goddess",
      "chausses_of_the_glorious_goddess",
      "greaves_of_the_glorious_goddess"
    ],
    "bonuses": [
      {
        "count": 2,
        "description": "Troop Defence 3%"
      },
      {
        "count": 4,
        "description": "Skill Damage Reduction 3%"
      },
      {
        "count": 6,
        "description": "Troop Health 5%"
      }
    ]
  },
  {
    "id": "witchs_wardrobe",
    "name": "Witch's Wardrobe",
    "pieces": [
      "witchs_feathered_staff",
      "witchs_deadwood_crown",
      "witchs_hexed_cloak",
      "witchs_crimson_bracers",
      "witchs_ornamented_pants",
      "witchs_mire_waders"
    ],
    "bonuses": [
      {
        "count": 2,
        "description": "Troop Load +25%"
      },
      {
        "count": 4,
        "description": "Extra Resources +5%"
      },
      {
        "count": 6,
        "description": "March Speed +10%"
      }
    ]
  },
  {
    "id": "revival_set",
    "name": "Revival Set",
    "pieces": [
      "revival_helm",
      "revival_plate",
      "revival_gauntlets",
      "revival_greaves"
    ],
    "bonuses": [
      {
        "count": 2,
        "description": "Troop Attack 3%"
      },
      {
        "count": 4,
        "description": "Troop Defence 3%"
      }
    ]
  },
  {
    "id": "forest_guardian",
    "name": "Forest Guardian Set",
    "pieces": [
      "scepter_of_the_forest_guardian",
      "mask_of_the_forest_guardian",
      "robe_of_the_forest_guardian",
      "claws_of_the_forest_guardian"
    ],
    "bonuses": [
      {
        "count": 2,
        "description": "Troop Load +20%"
      },
      {
        "count": 4,
        "description": "Extra Resources 5%"
      }
    ]
  },
  {
    "id": "harvester_set",
    "name": "Harvester Set",
    "pieces": [
      "harvester_robes",
      "harvesters_headscarf",
      "harvester_breeches",
      "harvester_boots"
    ],
    "bonuses": [
      {
        "count": 2,
        "description": "Gathering Speed +10%"
      },
      {
        "count": 4,
        "description": "Troop Load +20%"
      }
    ]
  },
  {
    "id": "windswept_set",
    "name": "Windswept Set",
    "pieces": [
      "windswept_war_helm",
      "windswept_breastplate",
      "windswept_bracers",
      "windswept_boots"
    ],
    "bonuses": [
      {
        "count": 2,
        "description": "Troop Attack 2%"
      },
      {
        "count": 4,
        "description": "March Speed 4%"
      }
    ]
  },
  {
    "id": "vanguard_set",
    "name": "Vanguard Set",
    "pieces": [
      "vanguard_halberd",
      "vanguard_greaves"
    ],
    "bonuses": [
      {
        "count": 2,
        "description": "Cavalry Attack 2%"
      }
    ]
  }
]