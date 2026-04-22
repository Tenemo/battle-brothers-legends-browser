if (!("Perks" in ::Const))
{
  ::Const.Perks <- {};
}

::Const.Perks.GetDynamicPerkTree <- function (_mins, _map, _allowRearrangement = true)
{
  local weaponClassMap = [
    [::Const.Perks.MilitiaClassTree, ::Const.Perks.AxeTree]
  ];

  return {
    Tree = [],
    Attributes = {}
  };
}
