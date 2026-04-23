this.legend_dormant_background <- this.inherit("scripts/skills/backgrounds/character_background", {
  m = {},
  function create()
  {
    this.character_background.create();
    this.m.ID = "background.legend_dormant";
    this.m.Name = "Dormant";
    this.m.PerkTreeDynamic = {
      Weapon = [],
      Defense = [],
      Traits = [
        ::Const.Perks.CalmTree
      ],
      Enemy = [],
      Class = [],
      Profession = [],
      Magic = []
    }
  }
});
