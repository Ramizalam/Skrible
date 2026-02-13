abstract class BaseSchema{
   private _id: string;

  public  constructor(_id: string) {
       this._id = _id;
    }

    //getter metho insetead of instance.getId()  just use instance.id
    public get id(): string{
        return this._id;
    }
}

export default BaseSchema;