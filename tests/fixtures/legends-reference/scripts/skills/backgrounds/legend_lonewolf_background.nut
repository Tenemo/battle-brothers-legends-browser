this.legend_lonewolf_background <- this.inherit("scripts/skills/backgrounds/character_background", {
  m = {},
  function create()
  {
    this.character_background.create();
    this.m.ID = "background.legend_lonewolf";
    this.m.Name = "Lone Wolf";
    this.m.Icon = "ui/backgrounds/background_lone_wolf.png";
    this.m.PerkTreeDynamic = {
      Weapon = [
        ::Const.Perks.AxeTree
      ],
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
