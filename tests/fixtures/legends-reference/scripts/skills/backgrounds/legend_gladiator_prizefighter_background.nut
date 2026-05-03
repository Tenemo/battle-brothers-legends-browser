this.legend_gladiator_prizefighter_background <- this.inherit("scripts/skills/backgrounds/character_background", {
  m = {},
  function create()
  {
    this.character_background.create();
    this.m.Name = "Gladiator Prizefighter";
    this.m.Icon = "ui/backgrounds/background_gladiator_prizefighter.png";
    this.m.DailyCost = 12;
    this.m.BackgroundType = this.Const.BackgroundType.Combat | this.Const.BackgroundType.Lowborn;
    this.m.Excluded = ::Legends.Legion.excludedTraits();
    this.m.ExcludedTalents = [
      this.Const.Attributes.Hitpoints,
      this.Const.Attributes.Fatigue
    ];
    this.m.Modifiers.Ammo = this.Const.LegendMod.ResourceModifiers.Ammo[1];
    this.m.Modifiers.Training = this.Const.LegendMod.ResourceModifiers.Training[1];
    this.m.PerkTreeDynamic = {
      Weapon = [
        ::Const.Perks.AxeTree
      ],
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
    }
  }

  function onAddEquipment()
  {
    this.getContainer().getActor().setVeteranPerks(3);
  }

  function onAdded()
  {
    ::Legends.Traits.grant(this, ::Legends.Trait.Bright);
  }
});
