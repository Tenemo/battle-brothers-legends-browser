::mods_hookExactClass("scenarios/world/lone_wolf_scenario", function (o) {
  o.create <- function ()
  {
    this.m.ID = "scenario.lone_wolf";
    this.m.Name = "Lone Wolf";
  }

  o.onSpawnAssets <- function ()
  {
    bros[0].setStartValuesEx([
      "legend_lonewolf_background"
    ]);
    ::Legends.Traits.grant(bros[0], ::Legends.Trait.Player);
    bros[0].getFlags().set("IsPlayerCharacter", true);
    bros[0].setVeteranPerks(2);
    ::Legends.Perks.grant(bros[0], ::Legends.Perk.LegendFavouredEnemyBeast);
  }
});
