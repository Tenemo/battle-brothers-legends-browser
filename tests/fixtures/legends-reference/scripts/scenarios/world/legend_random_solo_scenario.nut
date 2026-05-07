::mods_hookExactClass("scenarios/world/legend_random_solo_scenario", function (o) {
  o.create <- function ()
  {
    this.m.ID = "scenario.legend_random_solo";
    this.m.Name = "Random Solo";
  }

  o.onSpawnAssets <- function ()
  {
    bros[0].setStartValuesEx([
      "legend_gladiator_prizefighter_background"
    ]);
    bros[0].setVeteranPerks(2);
  }
});
