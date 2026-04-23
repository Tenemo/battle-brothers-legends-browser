this.legend_legionary_background <- this.inherit("scripts/skills/backgrounds/character_background", {
  m = {},
  function create()
  {
    this.character_background.create();
    this.m.ID = "background.legend_legionary";
    this.m.Name = "Legionary";
    this.m.PerkTreeDynamic = {
      Weapon = [
        ::Const.Perks.AxeTree
      ],
      Defense = [],
      Traits = [
        ::Const.Perks.CalmTree
      ],
      Enemy = [],
      Class = [
        ::Const.Perks.MilitiaClassTree
      ],
      Profession = [],
      Magic = []
    }
  }
});
