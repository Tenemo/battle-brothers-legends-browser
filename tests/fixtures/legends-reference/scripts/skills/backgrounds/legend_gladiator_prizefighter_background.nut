this.legend_gladiator_prizefighter_background <- this.inherit("scripts/skills/backgrounds/character_background", {
  m = {},
  function create()
  {
    this.character_background.create();
    this.m.Name = "Gladiator Prizefighter";
    this.m.Icon = "ui/backgrounds/background_gladiator_prizefighter.png";
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
});
