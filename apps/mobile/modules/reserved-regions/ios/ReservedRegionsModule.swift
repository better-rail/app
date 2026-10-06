import ExpoModulesCore

public class ReservedRegionsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReservedRegions")

    View(ReservedRegionsView.self) {
      Events("onDivisionsChange")
    }
  }
}
