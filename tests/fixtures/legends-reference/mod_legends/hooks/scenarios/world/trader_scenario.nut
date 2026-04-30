::mods_hookExactClass("scenarios/world/trader_scenario", function (o) {
  o.create <- function ()
  {
    this.m.ID = "scenario.trader";
    this.m.Name = "Trader";
  }

  o.onBuildPerkTree <- function ( _background )
  {
    this.addScenarioPerk(_background, ::Const.Perks.PerkDefs.LegendPeaceful, 0, true);
  }

  o.onSpawnAssets <- function ()
  {
    bros[0].setStartValuesEx([
      "legend_vala_background"
    ]);
    ::Legends.Traits.grant(bros[0], ::Legends.Trait.Player);
    bros[0].getFlags().set("IsPlayerCharacter", true);
    bros[0].setVeteranPerks(2);
  }
});
