::mods_hookExactClass("skills/backgrounds/beast_hunter_background", function(o)
{
  o.create = function ()
  {
    this.character_background.create();
    this.m.ID = "background.beast_slayer";
    this.m.Name = "Beast Slayer";
    this.m.Icon = "ui/backgrounds/background_57.png";
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
});
