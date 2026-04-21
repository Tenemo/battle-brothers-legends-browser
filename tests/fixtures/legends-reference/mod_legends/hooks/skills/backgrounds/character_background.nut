::mods_hookExactClass("skills/backgrounds/character_background", function(o)
{
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
