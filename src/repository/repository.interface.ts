export interface IRepository<T,CreateInput,UpdateInput,WhereUniqueInput> {
     findById(id:string):Promise<T|null>;
     findAll():Promise<T[]>;
     create(data:CreateInput):Promise<T>;
     update(id:WhereUniqueInput,data:UpdateInput):Promise<T>;
     delete(id:WhereUniqueInput):Promise<void>;
}