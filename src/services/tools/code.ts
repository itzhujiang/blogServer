
import { HandlerResult } from '../../utils/getSendResult';
import { ParameBodyType } from '../../utils/type';

type PhoneCodeParamsType = {
    phone: string;
}


const phoneCode = async (params: ParameBodyType<PhoneCodeParamsType>): Promise<HandlerResult<null>> => {
    // const { phone } = params;
};

export {
    phoneCode,
    PhoneCodeParamsType,
}