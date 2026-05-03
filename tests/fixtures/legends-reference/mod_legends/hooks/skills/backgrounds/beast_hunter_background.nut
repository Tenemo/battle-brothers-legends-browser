::mods_hookExactClass("skills/backgrounds/beast_hunter_background", function(o)
{
  o.create = function ()
  {
    this.character_background.create();
    this.m.ID = "background.beast_slayer";
    this.m.Name = "Beast Slayer";
    this.m.Icon = "ui/backgrounds/background_57.png";
    this.m.DailyCost = 6;
    this.m.BackgroundType = this.Const.BackgroundType.Crusader | this.Const.BackgroundType.Ranger | this.Const.BackgroundType.Educated;
    this.m.Excluded = [
      ::Legends.Traits.getID(::Legends.Trait.FearUndead)
    ];
    this.m.ExcludedTalents = [
      this.Const.Attributes.RangedSkill
    ];
    this.m.IsGuaranteed = [
      "disloyal_trait"
    ];
    this.m.Modifiers.ArmorParts = this.Const.LegendMod.ResourceModifiers.ArmorParts[2];
    this.m.Modifiers.Repair = this.Const.LegendMod.ResourceModifiers.Repair[2];
    this.m.Modifiers.Salvage = this.Const.LegendMod.ResourceModifiers.Salvage[1];
    this.m.Modifiers.Barter = this.Const.LegendMod.ResourceModifiers.Barter[0];
    this.m.Modifiers.Enchanting = 1.0;
    this.m.Modifiers.Terrain = [
      0.0,
      0.0,
      0.15,
      0.0,
      -0.05,
      0.0
    ];
    this.m.PerkTreeDynamicMins.Enemy = 2;
    this.m.PerkTreeDynamicMins.EnemyChance += 0.04;
    this.m.PerkTreeDynamic = {
      Weapon = [],
      Defense = [],
      Traits = [
        ::Const.Perks.CalmTree
      ],
      Enemy = [
        ::Const.Perks.BeastTree
      ],
      Class = [],
      Profession = [],
      Magic = []
    };
  }

  o.onAdded = function ()
  {
    ::Legends.Traits.grant(this, ::Legends.Trait.Quick);
  }
});
