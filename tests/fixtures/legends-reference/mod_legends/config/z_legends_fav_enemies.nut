::Const.LegendMod.FavoriteBeast <- [
  ::Const.EntityType.LegendBear,
  ::Const.EntityType.Spider
];

::Const.LegendMod.FavoriteOccult <- [
  ::Const.EntityType.LegendDemonAlp
];

::Const.LegendMod.GetFavoriteEnemyValue <- function (_type)
{
  switch(_type)
  {
  case ::Const.EntityType.LegendBear :
    return 2;

  case ::Const.EntityType.Spider :
    return 8;

  case ::Const.EntityType.LegendDemonAlp :
    return 4;
  }
}
