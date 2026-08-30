import { Article, DERNIERE_MISE_A_JOUR, Encadre, Section } from "@/app/(legal)/texte";

export const metadata = { title: "Politique de confidentialité" };

export default function PageConfidentialite() {
  return (
    <Article titre="Politique de confidentialité" date={DERNIERE_MISE_A_JOUR}>
      <Encadre>
        Moisson contient des informations sur des personnes qui n&apos;ont
        jamais ouvert de compte : leur nom, leur numéro, et leur position vis-à-vis
        de la foi. C&apos;est une donnée sensible dans beaucoup de contextes, et
        dangereuse dans certains. Ce document dit ce qui en est fait.
      </Encadre>

      <Section titre="Deux catégories de personnes">
        <p>
          <strong>Les utilisateurs</strong> : celles et ceux qui ouvrent un
          compte pour tenir leur suivi.
        </p>
        <p>
          <strong>Les personnes suivies</strong> : celles dont un utilisateur
          enregistre les coordonnées après une rencontre. Elles n&apos;ont pas de
          compte, ne se connectent jamais, et n&apos;ont pas choisi d&apos;être
          ici. Le reste de ce document leur accorde donc plus de place
          qu&apos;aux premières.
        </p>
      </Section>

      <Section titre="Ce qui est enregistré sur un utilisateur">
        <ul>
          <li>Son nom, son adresse e-mail, son église de rattachement.</li>
          <li>
            Une empreinte de son mot de passe, calculée par Argon2id. Le mot de
            passe lui-même n&apos;est jamais stocké et ne peut pas être retrouvé.
          </li>
          <li>
            Ses sessions actives : appareil, navigateur, adresse IP, dates. Cela
            sert à lui permettre de déconnecter un appareil perdu.
          </li>
        </ul>
      </Section>

      <Section titre="Ce qui est enregistré sur une personne suivie">
        <ul>
          <li>Prénom, nom, téléphone, adresse e-mail, sexe.</li>
          <li>Un secteur, c&apos;est-à-dire le quartier ou la zone de rencontre.</li>
          <li>
            Un statut décrivant sa position vis-à-vis de la foi, et les notes que
            l&apos;utilisateur choisit d&apos;écrire.
          </li>
          <li>Les visites planifiées et effectuées, et un fil des échanges.</li>
          <li>
            Une date de consentement, quand l&apos;utilisateur déclare avoir
            informé la personne.
          </li>
        </ul>
        <p>
          Aucune donnée n&apos;est collectée automatiquement sur ces personnes :
          tout est saisi à la main par l&apos;utilisateur qui les a rencontrées.
        </p>
      </Section>

      <Section titre="Qui peut voir ces informations">
        <p>
          <strong>Seul l&apos;utilisateur qui a créé un dossier peut le voir.</strong>{" "}
          Ni les autres utilisateurs, ni son église, ni un responsable. Le
          serveur répond « introuvable » à toute demande portant sur le dossier
          d&apos;un autre — et non « interdit », car répondre « interdit »
          confirmerait qu&apos;un dossier existe sur cette personne.
        </p>
        <p>
          Les personnes qui administrent le serveur ont, comme sur tout service,
          un accès technique à la base de données. Cet accès sert à faire
          fonctionner et sauvegarder le service, à rien d&apos;autre.
        </p>
      </Section>

      <Section titre="Ce qui n'est jamais fait">
        <ul>
          <li>Aucune vente, location ou échange de données, à personne.</li>
          <li>Aucune publicité, aucun profilage publicitaire.</li>
          <li>
            Aucun traceur d&apos;analyse d&apos;audience tiers, donc aucune
            bannière de consentement aux cookies : les seuls cookies posés sont
            ceux qui maintiennent la session ouverte.
          </li>
          <li>
            Aucune transmission à un tiers, sauf réquisition légale à laquelle
            nous serions contraints.
          </li>
        </ul>
      </Section>

      <Section titre="Combien de temps">
        <p>
          Les dossiers sont conservés tant que l&apos;utilisateur les garde.
          Supprimer un dossier le supprime réellement, avec ses visites et son
          fil — ce n&apos;est pas un simple masquage.
        </p>
        <p>
          Les sauvegardes de la base sont conservées de façon glissante ; une
          donnée supprimée disparaît des sauvegardes au fur et à mesure de leur
          rotation.
        </p>
      </Section>

      <Section titre="Être retiré de Moisson">
        <p>
          Si vous découvrez que vos coordonnées figurent dans Moisson et que
          vous ne le souhaitez pas, deux chemins :
        </p>
        <ul>
          <li>
            demandez-le à la personne qui vous a rencontré — elle peut supprimer
            votre dossier en quelques secondes ;
          </li>
          <li>
            ou écrivez-nous à l&apos;adresse ci-dessous. Nous rechercherons votre
            numéro dans la base et supprimerons ce qui vous concerne.
          </li>
        </ul>
        <p>
          Vous pouvez aussi demander à savoir ce qui est enregistré sur vous, à
          le faire corriger, ou à ce que plus personne ne puisse vous
          réenregistrer.
        </p>
      </Section>

      <Section titre="Sécurité">
        <p>
          Les mots de passe sont hachés par Argon2id. Les sessions reposent sur
          des jetons courts renouvelés en rotation : présenter deux fois le même
          jeton est traité comme un vol et déconnecte l&apos;appareil. Sur
          téléphone, les jetons vivent dans le trousseau du système ; sur le web,
          dans des cookies que le code de la page ne peut pas lire.
        </p>
        <p>
          Aucun système n&apos;est inviolable. En cas de fuite touchant des
          dossiers de suivi, les utilisateurs concernés seront prévenus, avec ce
          que nous savons de l&apos;étendue.
        </p>
      </Section>

      <Section titre="Nous écrire">
        <p>
          Responsable du traitement : <strong>[à compléter — nom et adresse de
          l&apos;association ou de la personne qui exploite le service]</strong>.
        </p>
        <p>
          Contact : <strong>[à compléter — adresse e-mail de contact]</strong>.
        </p>
      </Section>

      <Encadre variante="avertissement">
        Ce document décrit fidèlement le fonctionnement du logiciel, mais il
        n&apos;a pas été relu par un juriste. Avant une mise en service ouverte
        au public, il doit l&apos;être au regard du droit applicable là où le
        service est exploité.
      </Encadre>
    </Article>
  );
}
