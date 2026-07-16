export type AddressType = {
    houseNo: string;
    street: string;
    landmark: string;
    city: string;
    pincode: string;
};

export type ProductType = {
  _id:string;
  name:string,
  price:number,
  unit:string,
  image:string,
  quantity:number
}

export type CustomerTypeExport = {
   _id:string|null
  name: string;
  mobile: string;
  address: AddressType
  assignedDm: { name: string; mobile: string } | null;
  products?: ProductType[];
};
