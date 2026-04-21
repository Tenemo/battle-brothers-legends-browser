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
});
