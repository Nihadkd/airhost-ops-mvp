import { ServiceType } from "@prisma/client";

export const ORDERABLE_SERVICE_TYPES: ServiceType[] = [
  ServiceType.CLEANING,
  ServiceType.MOVING_CARRYING,
  ServiceType.GARDEN_WORK,
  ServiceType.DELIVERY_TRANSPORT,
  ServiceType.SMALL_REPAIRS,
  ServiceType.PET_CARE,
  ServiceType.TECHNICAL_HELP,
  ServiceType.KEY_HANDLING,
  ServiceType.OTHER,
];

export function getServiceTypeTranslationKey(type: string) {
  switch (type) {
    case ServiceType.CLEANING:
      return "serviceCleaningName";
    case ServiceType.MOVING_CARRYING:
      return "serviceMovingCarryingName";
    case ServiceType.GARDEN_WORK:
      return "serviceGardenWorkName";
    case ServiceType.DELIVERY_TRANSPORT:
      return "serviceDeliveryTransportName";
    case ServiceType.SMALL_REPAIRS:
      return "serviceSmallRepairsName";
    case ServiceType.PET_CARE:
      return "servicePetCareName";
    case ServiceType.TECHNICAL_HELP:
      return "serviceTechnicalHelpName";
    case ServiceType.KEY_HANDLING:
      return "serviceAirbnbServicesName";
    case ServiceType.OTHER:
      return "serviceOtherName";
    default:
      return null;
  }
}

export function isGuestCountServiceType(type: string) {
  return type === ServiceType.CLEANING;
}

export function isValidServiceType(type: string): type is ServiceType {
  return ORDERABLE_SERVICE_TYPES.includes(type as ServiceType);
}
