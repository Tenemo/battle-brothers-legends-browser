this.quick_trait <- this.inherit("scripts/skills/traits/character_trait", {
  function create()
  {
    this.m.ID = ::Legends.Traits.getID(::Legends.Trait.Quick);
    this.m.Name = "Quick";
    this.m.Icon = "ui/traits/trait_icon_32.png";
    this.m.Description = "Moves with unusual speed.";
  }
});
