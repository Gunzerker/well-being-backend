import { ApiProperty } from "@nestjs/swagger";

export class FetchDiscounts {
    @ApiProperty()
    readonly page_size: number;
    @ApiProperty()
    readonly page_number: number;
    @ApiProperty()
    readonly search: string;
    
     
}
