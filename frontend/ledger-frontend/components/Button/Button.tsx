//* Компонент "Бутон"

//& Стил
import './Button.css'

//* Интерфейс
interface ButtonProps {
    children: React.ReactNode; 
    disabled?: boolean; //? Статус, включен или изключен
    type?: "normal" | "danger" | "confirm" | "warning"; //* тип, виж Button.css за повече информация
}
//* Функция
export default function Button({ children,disabled = false, type = "normal" }: ButtonProps) {
    return (<button disabled={disabled} className={`button ${type}`}>{children}</button>); //% Добавяме класове
}