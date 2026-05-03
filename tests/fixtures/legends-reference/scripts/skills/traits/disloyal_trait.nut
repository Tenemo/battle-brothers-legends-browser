this.disloyal_trait <- this.inherit("scripts/skills/traits/character_trait", {
  function create()
  {
    this.m.ID = ::Legends.Traits.getID(::Legends.Trait.Disloyal);
    this.m.Name = "Disloyal";
    this.m.Icon = "ui/traits/disloyal_trait.png";
    this.m.Description = "Has no firm loyalty.";
  }
});
