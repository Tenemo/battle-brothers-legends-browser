if (!("Perks" in ::Const))
{
  ::Const.Perks <- {};
}

::Const.Perks.AxeTree <- {
  ID = "AxeTree",
  Name = "Axe",
  Icon = "ui/perks/perk_axe_mastery.png",
  Descriptions = [
    "axes"
  ],
  Tree = [
    [],
    [],
    [
      ::Legends.Perk.SpecAxe
    ],
    [],
    [],
    [],
    []
  ]
};

::Const.Perks.WeaponsTrees <- {
  GroupsCategory = "Weapon",
  Tree = [
    ::Const.Perks.AxeTree
  ]
};
