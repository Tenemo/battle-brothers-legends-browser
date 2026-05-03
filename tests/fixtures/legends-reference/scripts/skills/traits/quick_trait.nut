this.quick_trait <- this.inherit("scripts/skills/traits/character_trait", {
  function create()
  {
    this.m.ID = ::Legends.Traits.getID(::Legends.Trait.Quick);
    this.m.Name = "Quick";
  }
});
