import type { UserRoleEnum } from "../enum/UserRoleEnum.ts";


export interface PlayerDTO {
  name: string;
  id: string;
  role?: UserRoleEnum
  avatar: string;
}