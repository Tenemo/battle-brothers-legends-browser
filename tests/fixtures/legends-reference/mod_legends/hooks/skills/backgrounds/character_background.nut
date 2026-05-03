::mods_hookExactClass("skills/backgrounds/character_background", function(o)
{
  o.m.BackgroundType <- this.Const.BackgroundType.None;
  o.m.Modifiers <- {
    Ammo = this.Const.LegendMod.ResourceModifiers.Ammo[0],
    ArmorParts = this.Const.LegendMod.ResourceModifiers.ArmorParts[0],
    Meds = this.Const.LegendMod.ResourceModifiers.Meds[0],
    Stash = this.Const.LegendMod.ResourceModifiers.Stash[0],
    Healing = this.Const.LegendMod.ResourceModifiers.Healing[0],
    Injury = this.Const.LegendMod.ResourceModifiers.Injury[0],
    Repair = this.Const.LegendMod.ResourceModifiers.Repair[0],
    Salvage = this.Const.LegendMod.ResourceModifiers.Salvage[0],
    Crafting = this.Const.LegendMod.ResourceModifiers.Crafting[0],
    Barter = this.Const.LegendMod.ResourceModifiers.Barter[0],
    ToolConsumption = this.Const.LegendMod.ResourceModifiers.ToolConsumption[0],
    MedConsumption = this.Const.LegendMod.ResourceModifiers.MedConsumption[0],
    Hunting = this.Const.LegendMod.ResourceModifiers.Hunting[0],
    Fletching = this.Const.LegendMod.ResourceModifiers.Fletching[0],
    Scout = this.Const.LegendMod.ResourceModifiers.Scout[0],
    Gathering = this.Const.LegendMod.ResourceModifiers.Gather[0],
    Training = this.Const.LegendMod.ResourceModifiers.Training[0],
    Enchanting = 0.0,
    Terrain = [
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0
    ]
  };
  o.m.PerkTreeDynamicMins <- {
    Weapon = 8,
    Defense = 2,
    Traits = 7,
    Enemy = 1,
    EnemyChance = 0.01,
    Class = 1,
    ClassChance = 0.01,
    Profession = 1,
    ProfessionChance = 0.01,
    Magic = 1,
    MagicChance = 0
  };

  o.m.PerkTreeDynamicBase <- {
    Weapon = [],
    Defense = [],
    Traits = [
      ::Const.Perks.CalmTree
    ],
    Enemy = [],
    Class = [],
    Profession = [],
    Magic = []
  };
});
