import type { ReactElement } from 'react';
import { useNavigate } from 'react-router';
import Highlight from '@/components/highlight/Highlight';
import { Link } from 'react-router';
import styles from './notfound.module.css';

const TSUMIKI = `${import.meta.env.BASE_URL}tsumiki.png`;

export default function NotFound(): ReactElement {
    const navigate = useNavigate();
    const goBack = (): void => {
        const idx = (window.history.state as { idx?: number } | null)?.idx;
        if (typeof idx === 'number' && idx > 0) void navigate(-1);
        else void navigate('/', { replace: true });
    };

    return (
        <main>
            <div className={styles.funny}>
                <img className={styles.image} src={TSUMIKI} alt={"Tsumiki Miniwa surpresa"} />
                <p className={styles.caption}>
                    <Highlight affect="wobbly">Eeeeh!?</Highlight>
                </p>
            </div>

            <div className={styles.explanation}>
                <p>
                    404: Parece que essa página não está disponível.
                </p>
                <p>
                    Volte à página anterior usando o botão abaixo, ou escolha outra página no menu.
                </p>
                <button type="button" className={styles.back} onClick={goBack}>
                    <span aria-hidden="true">&larr;</span> Voltar
                </button>
            </div>
            <p className={styles.credits}>
                Créditos da imagem: desenho feito pela <Link to={"https://github.com/2besita"}>minha namorada</Link> :)
            </p>
        </main>
    );
}
