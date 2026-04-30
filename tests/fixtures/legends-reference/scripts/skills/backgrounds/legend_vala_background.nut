this.legend_vala_background <- this.inherit("scripts/skills/backgrounds/character_background", {
  m = {},
  function create()
  {
    this.character_background.create();
    this.m.ID = "background.legend_vala";
    this.m.Name = "Vala";
    this.m.Icon = "ui/backgrounds/background_vala.png";
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

  function onAddEquipment()
  {
    this.getContainer().getActor().setVeteranPerks(3);
  }
});
