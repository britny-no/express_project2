export const pwRegexp = /^(?!((?:[0-9]+)|(?:[a-zA-Z]+)|(?:[\[\]\^\$\.\|\?\*\+\(\)\\~`\!@#%&\-_+={}'""<>:;,\n]+))$)(.){8,16}$/;
export const emailRegexp = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i;
export const phoneRegexp = /^01(?:0|1|[6-9])(\d{3}|\d{4})\d{4}$/;
export const birthRegexp = /^(\d{4})-(0[0-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/;