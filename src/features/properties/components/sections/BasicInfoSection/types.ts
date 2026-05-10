export interface BasicInfoSectionProps {
  address: string;
  setAddress: (v: string) => void;
  officePhone: string;
  setOfficePhone: (v: string) => void;
  officePhone2?: string;
  setOfficePhone2: (v: string) => void;
  setCoords?: (lat: number, lng: number) => void;
  showValidationErrors?: boolean;
}
