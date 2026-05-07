::mods_hookExactClass("scenarios/world/legends_free_company_scenario", function (o) {
  o.create <- function ()
  {
    this.m.ID = "scenario.legends_free_company";
    this.m.Name = "The Free Company";
  }

  o.onSpawnAssets <- function ()
  {
    bros[0].setStartValuesEx([
      "legend_gladiator_prizefighter_background"
    ]);
    bros[0].setVeteranPerks(2);
  }
});
