this.arena_building <- this.inherit("scripts/entity/world/settlements/buildings/building", {
  function onUpdateHiringRoster( _roster )
  {
    this.addBroToRoster(_roster, "legend_gladiator_prizefighter_background", true);
    // this.addBroToRoster(_roster, "legend_dormant_background", true);
  }
});
