::mods_hookExactClass("scenarios/world/lone_wolf_scenario", function (o) {
  o.create <- function ()
  {
    this.m.ID = "scenario.lone_wolf";
    this.m.Name = "Lone Wolf";
  }

  o.onSpawnAssets <- function ()
  {
    ::Legends.Perks.grant(bros[0], ::Legends.Perk.LegendFavouredEnemyBeast);
  }
});
