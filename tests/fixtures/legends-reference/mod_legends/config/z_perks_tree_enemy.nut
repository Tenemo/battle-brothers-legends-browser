if (!("Perks" in ::Const))
{
  ::Const.Perks <- {};
}

local category = "Enemy";

::Const.Perks.BeastTree <- {
  ID = "BeastTree",
  Name = "Beasts",
  Icon = "ui/perks/favoured_bear_01.png",
  Category = category,
  Descriptions = [
    "beasts"
  ],
  Tree = [
    [],
    [],
    [
      ::Legends.Perk.LegendFavouredEnemyBeast
    ],
    [],
    [],
    [],
    []
  ]
};

::Const.Perks.EnemyTrees <- {
  GroupsCategory = "Enemy",
  Tree = [
    ::Const.Perks.BeastTree
  ]
};
