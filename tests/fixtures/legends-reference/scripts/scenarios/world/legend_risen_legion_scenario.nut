this.legend_risen_legion_scenario <- this.inherit("scripts/scenarios/world/starting_scenario", {
  function onSpawnAssets()
  {
    local brother = this.World.getPlayerRoster().create("scripts/entity/tactical/player");
    brother.setStartValuesEx(this.Const.CharacterLegionBackgroundsHIGH);
  }
});
