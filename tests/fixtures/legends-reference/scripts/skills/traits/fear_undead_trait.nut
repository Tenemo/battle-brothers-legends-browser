this.fear_undead_trait <- this.inherit("scripts/skills/traits/character_trait", {
  function create()
  {
    this.m.ID = ::Legends.Traits.getID(::Legends.Trait.FearUndead);
    this.m.Name = "Fear of Undead";
  }
});
