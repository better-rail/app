//
// INStation.swift
//
// This file was automatically generated and should not be edited.
//

#if canImport(Intents)

import Intents

@available(iOS 12.0, macOS 11.0, watchOS 5.0, *) @available(tvOS, unavailable)
@objc(INStation)
public class INStation: INObject {

    override public class var supportsSecureCoding: Bool { true }

}

@available(iOS 13.0, macOS 11.0, watchOS 6.0, *) @available(tvOS, unavailable)
@objc(INStationResolutionResult)
public class INStationResolutionResult: INObjectResolutionResult {

    // This resolution result is for when the app extension wants to tell Siri to proceed, with a given INStation. The resolvedValue can be different than the original INStation. This allows app extensions to apply business logic constraints.
    // Use notRequired() to continue with a 'nil' value.
    @objc(successWithResolvedINStation:)
    public class func success(with resolvedObject: INStation) -> Self {
        return super.success(with: resolvedObject)
    }

    // This resolution result is to ask Siri to disambiguate between the provided INStation.
    @objc(disambiguationWithINStationsToDisambiguate:)
    public class func disambiguation(with objectsToDisambiguate: [INStation]) -> Self {
        return super.disambiguation(with: objectsToDisambiguate)
    }

    // This resolution result is to ask Siri to confirm if this is the value with which the user wants to continue.
    @objc(confirmationRequiredWithINStationToConfirm:)
    public class func confirmationRequired(with objectToConfirm: INStation?) -> Self {
        return super.confirmationRequired(with: objectToConfirm)
    }

    @available(*, unavailable)
    override public class func success(with resolvedObject: INObject) -> Self {
        fatalError()
    }

    @available(*, unavailable)
    override public class func disambiguation(with objectsToDisambiguate: [INObject]) -> Self {
        fatalError()
    }

    @available(*, unavailable)
    override public class func confirmationRequired(with objectToConfirm: INObject?) -> Self {
        fatalError()
    }

}

#endif
