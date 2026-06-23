import { useSearchParams } from "react-router";
import CustomizationTemplateListPage from "../CustomizationTemplateListPage";
import CustomizationTemplatePage from "../CustomizationTemplatePage";

export function CustomizationTemplatesRouter() {
  const [searchParams] = useSearchParams();
  const edit = searchParams.get("edit");
  return edit ? <CustomizationTemplatePage /> : <CustomizationTemplateListPage />;
}
