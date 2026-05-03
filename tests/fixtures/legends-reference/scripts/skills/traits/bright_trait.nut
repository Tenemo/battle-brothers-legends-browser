this.bright_trait <- this.inherit("scripts/skills/traits/character_trait", {
  function create()
  {
    this.m.ID = ::Legends.Traits.getID(::Legends.Trait.Bright);
    this.m.Name = "Bright";
    this.m.Icon = "ui/traits/trait_icon_11.png";
    this.m.Description = "Learns quickly.";
  }
});
