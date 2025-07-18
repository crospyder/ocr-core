def is_valid_oib(oib: str) -> bool:
    if not oib or len(oib) != 11 or not oib.isdigit():
        return False

    digits = list(map(int, oib))
    control = 10
    for i in range(10):
        control = control + digits[i]
        control = control % 10
        if control == 0:
            control = 10
        control = (control * 2) % 11

    control_digit = 11 - control
    if control_digit == 10:
        control_digit = 0

    return digits[10] == control_digit
