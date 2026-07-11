export type AddressType = {
    houseNo: string;
    street: string;
    landmark: string;
    city: string;
    pincode: string;
};

export type ProductType = {
  name:string,
  price:number,
  unit:string,
  image:string,
  quantity:number
}

export type CustomerTypeExport = {
  name: string;
  mobile: string;
  address: AddressType
  assignedDm: { name: string; mobile: string } | null;
  products?: ProductType[];
};
