import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/context/LanguageContext";

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t('notFound.title')}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('notFound.message')}</p>
        <button onClick={() => navigate("/")} className="text-primary underline hover:text-primary/90">
          {t('notFound.homeLink')}
        </button>
      </div>
    </div>
  );
};

export default NotFound;
