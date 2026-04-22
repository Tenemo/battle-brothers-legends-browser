if (!("Perks" in ::Const))
{
  ::Const.Perks <- {};
}

::Const.Perks.MilitiaClassTree <- {
  ID = "MilitiaClassTree",
  Name = "Militia",
  Icon = "ui/perks/class_militia.png",
  Descriptions = [
    "militia"
  ],
  Tree = [
    [
      ::Legends.Perk.LegendPeaceful
    ],
    [],
    [],
    [],
    [],
    [],
    []
  ]
};

::Const.Perks.ClassTrees <- {
  GroupsCategory = "Class",
  Tree = [
    ::Const.Perks.MilitiaClassTree
  ]
};
