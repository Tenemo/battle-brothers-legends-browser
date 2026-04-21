if (!("Perks" in ::Const))
{
  ::Const.Perks <- {};
}

::Const.Perks.CalmTree <- {
  ID = "CalmTree",
  Name = "Calm",
  Icon = "ui/perks/clarity_circle.png",
  Descriptions = [
    "is calm"
  ],
  Tree = [
    [],
    [],
    [],
    [],
    [
      ::Legends.Perk.LegendClarity
    ],
    [],
    []
  ]
};

::Const.Perks.TraitsTrees <- {
  GroupsCategory = "Traits",
  Tree = [
    ::Const.Perks.CalmTree
  ]
};
