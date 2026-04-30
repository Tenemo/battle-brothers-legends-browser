::mods_hookExactClass("scenarios/world/beast_hunters_scenario", function (o) {
  o.m.FavouredEnemyPerks <- [
    ::Legends.Perk.LegendFavouredEnemyBeast,
    ::Legends.Perk.LegendFavouredEnemyOccult
  ];

  o.create <- function ()
  {
    this.m.ID = "scenario.beast_hunters";
    this.m.Name = "Beast Slayers";
  }

  o.onBuildPerkTree <- function ( _background )
  {
    local perk = ::MSU.Array.rand(this.m.FavouredEnemyPerks);
    this.addScenarioPerk(_background, perk);
  }

  o.onSpawnAssets <- function ()
  {
    bros[1].setStartValuesEx([
      "beast_hunter_background"
    ]);
    bros[1].setVeteranPerks(2);
  }
});
